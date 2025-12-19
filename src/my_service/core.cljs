(ns my-service.core
  (:require [promesa.core :as p]
            [clojure.string :as str]
            ["pg" :refer [Pool]]
            ["telegram" :refer [TelegramClient Api]]
            ["telegram/sessions/StringSession.js" :refer [StringSession]]
            ["telegram/events/index.js" :refer [NewMessage]]))

;; ============================================================
;; Pure: Config
;; ============================================================

(defn build-config [env]
  (let [get-env (fn [k]
                  (or (aget env k)
                      (throw (ex-info (str "Missing env: " k) {:key k}))))]
    {:pg {:url (get-env "DATABASE_URL")}
     :telegram {:app-id (parse-long (get-env "APP_ID"))
                :api-hash (get-env "API_HASH")
                :session (get-env "SESSION")}}))

;; ============================================================
;; Pure: Rule Engine
;; ============================================================

(defmulti check-condition (fn [c _] (:type c)))

(defmethod check-condition "contains" [c text]
  {:match? (str/includes? text (:value c))})

(defmethod check-condition "not_contains" [c text]
  {:match? (not (str/includes? text (:value c)))})

(defmethod check-condition "exact" [c text]
  {:match? (= text (:value c))})

(defmethod check-condition "regex" [c text]
  {:match? (boolean (re-find (re-pattern (:value c)) text))})

(defmethod check-condition "regex_extract" [c text]
  (if-let [match (re-find (re-pattern (:value c)) text)]
    {:match? true
     :extracted {(keyword (:field c))
                 (if (vector? match) (second match) match)}}
    {:match? false}))

(defn check-rule [rule text]
  (let [{:keys [match items]} (:conditions rule)
        results (mapv #(check-condition % text) items)
        match-fn (if (= match "all") every? some)]
    {:match? (match-fn :match? results)
     :data (into {} (keep :extracted results))}))

(defn match-rules [rules text]
  (keep (fn [rule]
          (let [{:keys [match? data]} (check-rule rule text)]
            (when match?
              (assoc rule :data data))))
        rules))

;; ============================================================
;; Pure: Template
;; ============================================================

(defn process-template [template data]
  (str/replace template
               #"\{(\w+)\}"
               (fn [[match key]]
                 (get data (keyword key) match))))

;; ============================================================
;; Pure: Message → Effect
;; ============================================================

(defn matched->action [{:keys [channel message is_template data]}]
  {:channel channel
   :message (if is_template
              (process-template message data)
              message)})

(defn process-message [rules text]
  (let [matched (match-rules rules text)
        actions (mapv matched->action matched)]
    (if (empty? actions)
      {:effect :skip
       :text-preview (subs text 0 (min 50 (count text)))}
      {:effect :send
       :actions actions})))

;; ============================================================
;; Pure: Queries (data)
;; ============================================================

(def queries
  {:test
   {:sql "SELECT 1"}

   :load-rules
   {:sql "SELECT s.telegram_id, r.id as rule_id, r.name, r.conditions,
                 a.channel, a.message, a.is_template
          FROM source s
          JOIN rule r ON r.source_id = s.id AND r.active = true
          JOIN action a ON a.rule_id = r.id"}})

;; ============================================================
;; Side Effects: DB
;; ============================================================

(defn query! [^js pool {:keys [sql params]}]
  (p/let [result (.query pool sql (clj->js (or params [])))
          rows (js->clj (.-rows result) :keywordize-keys true)]
    rows))

(defn connect-db! [url]
  (p/let [^js pool (Pool. #js {:connectionString url})]
    (.on pool "error" #(println "[DB Error]" %))
    (query! pool (:test queries))
    (println "[DB] Connected")
    pool))


;; ============================================================
;; Side Effects: Telegram
;; ============================================================

(defn connect-telegram! [{:keys [app-id api-hash session]}]
  (p/let [client (TelegramClient. (StringSession. session) app-id api-hash
                                  #js {:connectionRetries 5})]
    (.start client #js {:onError #(println "[TG Error]" %)})
    (.connect client)
    (p/let [me (.getMe ^js client)]
      (println "[TG] Connected as @" (.-username me))
      client)))

(defn mark-as-read! [^js client channels]
  (p/loop [chs (seq channels)]
    (when-let [[ch & rest] chs]
      (p/do
        (.invoke client
                 (Api.channels.ReadHistory. #js {:channel ch :maxId 0}))
        (p/recur rest)))))

(defn listen! [^js client channels handler]
  (let [event-filter (NewMessage. #js {:incoming true :chats (clj->js channels)})]
    (.addEventHandler client
                      (fn [event]
                        (-> (p/do
                              (handler (.-message event))
                              (mark-as-read! client channels))
                            (p/catch #(println "[Listener Error]" %))))
                      event-filter)))

;; ============================================================
;; Side Effects: Effect Interpreter
;; ============================================================

(defmulti execute! (fn [_sys effect] (:effect effect)))

(defmethod execute! :skip [_ {:keys [text-preview]}]
  (println "[Skip]" text-preview)
  (p/resolved nil))

(defmethod execute! :send [{:keys [^js client]} {:keys [actions]}]
  (println "[Send]" (count actions) "messages")
  (p/all
   (mapv (fn [{:keys [channel message]}]
           (println "  →" channel)
           (.sendMessage client channel #js {:message message}))
         actions)))

;; ============================================================
;; Side Effects: App Lifecycle
;; ============================================================

(defn read-env! []
  (js->clj js/process.env))

(defn shutdown! [{:keys [^js pool ^js client]}]
  (println "\n[App] Shutting down...")
  (p/do (.end pool)
        (.disconnect client)
        (println "[App] Bye!")))

(defn start! []
  (p/let [config (build-config (read-env!))
          pool (connect-db! (get-in config [:pg :url]))
          client (connect-telegram! (:telegram config))
          rules (query! pool (:load-rules queries))
          _ (println "[App] Loaded" (count rules) "rules")
          sys {:pool pool :client client}
          channels (->> rules (map :telegram_id) distinct)]

    (listen! client channels
             (fn [msg]
               (-> (execute! sys (process-message rules (.-message msg)))
                   (p/catch #(println "[Error]" %)))))

    (.on js/process "SIGINT" #(p/do (shutdown! sys)
                                    (.exit js/process 0)))
    (println "[App] Listening to" (count channels) "channels...")
    sys))

(defn main []
  (-> (start!)
      (p/catch #(do (println "[Fatal]" %)
                    (.exit js/process 1)))))

;; ============================================================
;; REPL Helpers
;; ============================================================

(defonce sys (atom nil))

(defn p>! [promise]
  (p/let [res promise]
    (swap! sys assoc :last-result res)))

(comment
  (p/let [s (start!)]
    (reset! sys s))

  (process-message [{:conditions {:match "all"
                                  :items [{:type :contains :value "test"}]}
                     :channel "@out"
                     :message "Got it!"
                     :is_template false}]
                   "this is a test")

  (p>! (query! (:pool @sys) (:load-rules queries)))

  (shutdown! @sys))
