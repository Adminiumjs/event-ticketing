/**
 * Area bundle: **data**.
 *
 * Owns the prose inside the seeded fiction — the kind of night each show is,
 * the two room names, the ticket-type names and their one-line notes, and the
 * six show descriptions.
 *
 * `data/demo.ts` stores KEYS for all of these, never English, so a locale
 * switch re-renders the fiction rather than leaving an English island inside a
 * translated screen. Proper nouns — show names, act names, people's names,
 * e-mail addresses — stay literal in `demo.ts` and are absent here. The one
 * proper noun that does appear is the album title “Slow Furnace”, which stays
 * literal in every locale inside that locale's own quotation marks.
 *
 * Same rules as the other bundles: all eight locales, `en-US` is the source of
 * truth. And the same vocabulary rule: the different kinds of ticket are ticket
 * TYPES in every locale — never the ranked-price synonym English reaches for,
 * and never a synonym of it in translation either.
 *
 * Clock times are written the way `lib/format.ts` renders them for that locale,
 * so a hard-coded note never disagrees with a formatted one: `19:30` almost
 * everywhere, `19.30` in Danish. `ar-EG` keeps ordinary digits here — Intl does
 * the Arabic-Indic transliteration at render time.
 *
 * French carries its typographic apostrophes and the no-break spaces its
 * punctuation demands, written `\u00A0` so a reviewer can see them.
 */
import type { LocaleTag } from "../locales.ts";

const EN = {
  /* --- what kind of night it is --- */
  "data.sub.club": "Club night",
  "data.sub.acoustic": "An acoustic evening",
  "data.sub.release": "Album release night",
  "data.sub.festival": "Two days · both rooms",

  /* --- the two rooms --- */
  "data.room.main": "Main Hall",
  "data.room.annex": "The Annex",
  "data.room.both": "Main Hall + Annex",

  /* --- ticket types --- */
  "data.tt.early": "Early entry",
  "data.tt.standard": "Standard",
  "data.tt.balcony": "Balcony",
  "data.tt.supporter": "Supporter",
  "data.tt.weekend": "Weekend pass",
  "data.tt.saturday": "Saturday",
  "data.tt.sunday": "Sunday",

  /* --- ticket-type notes --- */
  "data.note.balcony": "Raised balcony · its own bar",
  "data.note.neon.early": "Entry from 19:30 · beat the line",
  "data.note.neon.standard": "Entry from doors at 20:00",
  "data.note.velvet.early": "Entry from 18:30",
  "data.note.velvet.standard": "Entry from doors at 19:00",
  "data.note.velvet.supporter": "Includes a signed poster",
  "data.note.cinder.early": "Entry from 21:30",
  "data.note.cinder.standard": "Entry from doors at 22:00",
  "data.note.static.early": "Entry from 20:30",
  "data.note.static.standard": "Entry from doors at 21:00",
  "data.note.hollow.early": "Entry from 20:30",
  "data.note.hollow.standard": "Entry from doors at 21:00",
  "data.note.week.weekend": "Both days · both rooms",
  "data.note.week.day": "One day · both rooms",

  /* --- show descriptions --- */
  "data.desc.neon":
    "A late-summer club night built around modular hardware and a very loud room. Expect long builds, strobe-washed drops, and the Main Hall PA doing exactly what it was hired to do.",
  "data.desc.velvet":
    "The Annex goes quiet for one night: two voices, one tape machine, and candles the fire marshal signed off on. Unplugged, unhurried, close.",
  "data.desc.cinder":
    "Cinder play “Slow Furnace” front to back, then burn the rest of the night down with friends on the decks until close.",
  "data.desc.static":
    "The broken-beat residency returns. Every edition has sold out; this one went in eleven days. If you have a ticket, guard it.",
  "data.desc.hollow":
    "Deep, slow and submerged — the Annex rig tuned for sub-bass you feel in your ribs a moment before you hear it.",
  "data.desc.week":
    "Our little festival: fourteen acts over two days across both rooms, food trucks in the yard, and the Sunday-night all-hands closing set that ends the season.",
} as const satisfies Record<string, string>;

/** Deutsch. Der große Saal und der Anbau sind die beiden Räume. */
const DE = {
  /* --- what kind of night it is --- */
  "data.sub.club": "Clubnacht",
  "data.sub.acoustic": "Ein akustischer Abend",
  "data.sub.release": "Album-Release-Nacht",
  "data.sub.festival": "Zwei Tage · beide Säle",

  /* --- the two rooms --- */
  "data.room.main": "Großer Saal",
  "data.room.annex": "Der Anbau",
  "data.room.both": "Großer Saal + Anbau",

  /* --- ticket types --- */
  "data.tt.early": "Früheinlass",
  "data.tt.standard": "Standard",
  "data.tt.balcony": "Balkon",
  "data.tt.supporter": "Förderticket",
  "data.tt.weekend": "Wochenendpass",
  "data.tt.saturday": "Samstag",
  "data.tt.sunday": "Sonntag",

  /* --- ticket-type notes --- */
  "data.note.balcony": "Erhöhter Balkon · eigene Bar",
  "data.note.neon.early": "Einlass ab 19:30 · vor der Schlange drin",
  "data.note.neon.standard": "Einlass ab Türöffnung um 20:00",
  "data.note.velvet.early": "Einlass ab 18:30",
  "data.note.velvet.standard": "Einlass ab Türöffnung um 19:00",
  "data.note.velvet.supporter": "Inklusive signiertem Poster",
  "data.note.cinder.early": "Einlass ab 21:30",
  "data.note.cinder.standard": "Einlass ab Türöffnung um 22:00",
  "data.note.static.early": "Einlass ab 20:30",
  "data.note.static.standard": "Einlass ab Türöffnung um 21:00",
  "data.note.hollow.early": "Einlass ab 20:30",
  "data.note.hollow.standard": "Einlass ab Türöffnung um 21:00",
  "data.note.week.weekend": "Beide Tage · beide Säle",
  "data.note.week.day": "Ein Tag · beide Säle",

  /* --- show descriptions --- */
  "data.desc.neon":
    "Eine Spätsommer-Clubnacht rund um modulare Hardware und einen sehr lauten Saal. Erwartet lange Steigerungen, stroboskopgeflutete Drops und eine PA im Großen Saal, die genau das tut, wofür sie geholt wurde.",
  "data.desc.velvet":
    "Der Anbau wird für einen Abend still: zwei Stimmen, eine Bandmaschine und Kerzen, die der Brandschutzbeauftragte abgesegnet hat. Unplugged, unaufgeregt, nah.",
  "data.desc.cinder":
    "Cinder spielen „Slow Furnace“ von vorne bis hinten und brennen danach mit Freunden an den Decks den Rest der Nacht ab, bis zugesperrt wird.",
  "data.desc.static":
    "Die Broken-Beat-Residency ist zurück. Jede Ausgabe war ausverkauft, diese hier ging in elf Tagen weg. Wer eine Karte hat, passt gut darauf auf.",
  "data.desc.hollow":
    "Tief, langsam und untergetaucht — die Anlage im Anbau auf Sub-Bass eingestellt, den man einen Moment früher in den Rippen spürt, als man ihn hört.",
  "data.desc.week":
    "Unser kleines Festival: vierzehn Acts an zwei Tagen in beiden Sälen, Foodtrucks im Hof und das gemeinsame Abschlussset am Sonntagabend, mit dem die Saison endet.",
} satisfies Record<keyof typeof EN, string>;

/** Français. Apostrophes typographiques et espaces insécables avant : ; ! ? et dans « ». */
const FR = {
  /* --- what kind of night it is --- */
  "data.sub.club": "Soirée club",
  "data.sub.acoustic": "Une soirée acoustique",
  "data.sub.release": "Soirée de sortie d’album",
  "data.sub.festival": "Deux jours · les deux salles",

  /* --- the two rooms --- */
  "data.room.main": "Grande salle",
  "data.room.annex": "L’Annexe",
  "data.room.both": "Grande salle + Annexe",

  /* --- ticket types --- */
  "data.tt.early": "Entrée anticipée",
  "data.tt.standard": "Standard",
  "data.tt.balcony": "Balcon",
  "data.tt.supporter": "Soutien",
  "data.tt.weekend": "Pass week-end",
  "data.tt.saturday": "Samedi",
  "data.tt.sunday": "Dimanche",

  /* --- ticket-type notes --- */
  "data.note.balcony": "Balcon surélevé · bar dédié",
  "data.note.neon.early": "Entrée dès 19:30 · évitez la file",
  "data.note.neon.standard": "Entrée à l’ouverture des portes, 20:00",
  "data.note.velvet.early": "Entrée dès 18:30",
  "data.note.velvet.standard": "Entrée à l’ouverture des portes, 19:00",
  "data.note.velvet.supporter": "Affiche dédicacée incluse",
  "data.note.cinder.early": "Entrée dès 21:30",
  "data.note.cinder.standard": "Entrée à l’ouverture des portes, 22:00",
  "data.note.static.early": "Entrée dès 20:30",
  "data.note.static.standard": "Entrée à l’ouverture des portes, 21:00",
  "data.note.hollow.early": "Entrée dès 20:30",
  "data.note.hollow.standard": "Entrée à l’ouverture des portes, 21:00",
  "data.note.week.weekend": "Les deux jours · les deux salles",
  "data.note.week.day": "Un jour · les deux salles",

  /* --- show descriptions --- */
  "data.desc.neon":
    "Une soirée club de fin d’été bâtie autour de machines modulaires et d’une salle très forte. Attendez-vous à de longues montées, à des drops noyés de stroboscopes et à la sono de la Grande salle qui fait exactement ce pour quoi on l’a fait venir.",
  "data.desc.velvet":
    "L’Annexe se tait le temps d’une soirée\u00A0: deux voix, un magnétophone à bandes et des bougies validées par le service incendie. Acoustique, sans hâte, tout près.",
  "data.desc.cinder":
    "Cinder joue «\u00A0Slow Furnace\u00A0» de bout en bout, puis fait brûler le reste de la nuit avec des amis aux platines jusqu’à la fermeture.",
  "data.desc.static":
    "La résidence broken beat revient. Chaque édition a affiché complet\u00A0; celle-ci est partie en onze jours. Si vous avez un billet, gardez-le précieusement.",
  "data.desc.hollow":
    "Profond, lent et immergé — le système de l’Annexe calé sur des sub-basses que l’on sent dans les côtes un instant avant de les entendre.",
  "data.desc.week":
    "Notre petit festival\u00A0: quatorze artistes sur deux jours dans les deux salles, des food trucks dans la cour, et le set de clôture collectif du dimanche soir qui referme la saison.",
} satisfies Record<keyof typeof EN, string>;

/** Čeština. Popisky v prvním pádě; „v/ve“ podle času, který následuje. */
const CS = {
  /* --- what kind of night it is --- */
  "data.sub.club": "Klubová noc",
  "data.sub.acoustic": "Akustický večer",
  "data.sub.release": "Křest alba",
  "data.sub.festival": "Dva dny · oba sály",

  /* --- the two rooms --- */
  "data.room.main": "Velký sál",
  "data.room.annex": "Přístavba",
  "data.room.both": "Velký sál + Přístavba",

  /* --- ticket types --- */
  "data.tt.early": "Dřívější vstup",
  "data.tt.standard": "Standard",
  "data.tt.balcony": "Balkon",
  "data.tt.supporter": "Podporovatel",
  "data.tt.weekend": "Víkendová permanentka",
  "data.tt.saturday": "Sobota",
  "data.tt.sunday": "Neděle",

  /* --- ticket-type notes --- */
  "data.note.balcony": "Vyvýšený balkon · vlastní bar",
  "data.note.neon.early": "Vstup od 19:30 · bez čekání ve frontě",
  "data.note.neon.standard": "Vstup od otevření dveří ve 20:00",
  "data.note.velvet.early": "Vstup od 18:30",
  "data.note.velvet.standard": "Vstup od otevření dveří v 19:00",
  "data.note.velvet.supporter": "Součástí je podepsaný plakát",
  "data.note.cinder.early": "Vstup od 21:30",
  "data.note.cinder.standard": "Vstup od otevření dveří ve 22:00",
  "data.note.static.early": "Vstup od 20:30",
  "data.note.static.standard": "Vstup od otevření dveří ve 21:00",
  "data.note.hollow.early": "Vstup od 20:30",
  "data.note.hollow.standard": "Vstup od otevření dveří ve 21:00",
  "data.note.week.weekend": "Oba dny · oba sály",
  "data.note.week.day": "Jeden den · oba sály",

  /* --- show descriptions --- */
  "data.desc.neon":
    "Pozdně letní klubová noc postavená na modulárním hardwaru a pořádně hlasitém sále. Čekejte dlouhé gradace, stroboskopem prosvícené dropy a aparaturu ve Velkém sále, která dělá přesně to, kvůli čemu tam je.",
  "data.desc.velvet":
    "Přístavba se na jeden večer ztiší: dva hlasy, jeden páskový magnetofon a svíčky, které posvětil požární technik. Unplugged, beze spěchu, zblízka.",
  "data.desc.cinder":
    "Cinder zahrají „Slow Furnace“ od začátku do konce a pak s přáteli za gramofony spálí zbytek noci až do zavíračky.",
  "data.desc.static":
    "Broken beatová rezidence se vrací. Každý díl byl vyprodaný, tenhle zmizel za jedenáct dní. Jestli máte vstupenku, opatrujte ji.",
  "data.desc.hollow":
    "Hluboké, pomalé a ponořené — aparatura v Přístavbě naladěná na subbas, který ucítíte v žebrech o chvilku dřív, než ho uslyšíte.",
  "data.desc.week":
    "Náš malý festival: čtrnáct kapel během dvou dnů v obou sálech, food trucky na dvoře a nedělní společný závěrečný set, kterým končí sezona.",
} satisfies Record<keyof typeof EN, string>;

/** Dansk. Klokkeslæt med punktum, som Intl skriver dem for da-DK. */
const DA = {
  /* --- what kind of night it is --- */
  "data.sub.club": "Klubaften",
  "data.sub.acoustic": "En akustisk aften",
  "data.sub.release": "Album-releaseaften",
  "data.sub.festival": "To dage · begge sale",

  /* --- the two rooms --- */
  "data.room.main": "Store Sal",
  "data.room.annex": "Annekset",
  "data.room.both": "Store Sal + Anneks",

  /* --- ticket types --- */
  "data.tt.early": "Tidlig adgang",
  "data.tt.standard": "Standard",
  "data.tt.balcony": "Balkon",
  "data.tt.supporter": "Støttebillet",
  "data.tt.weekend": "Weekendpas",
  "data.tt.saturday": "Lørdag",
  "data.tt.sunday": "Søndag",

  /* --- ticket-type notes --- */
  "data.note.balcony": "Hævet balkon · egen bar",
  "data.note.neon.early": "Indgang fra 19.30 · uden om køen",
  "data.note.neon.standard": "Indgang når dørene åbner 20.00",
  "data.note.velvet.early": "Indgang fra 18.30",
  "data.note.velvet.standard": "Indgang når dørene åbner 19.00",
  "data.note.velvet.supporter": "Inkluderer en signeret plakat",
  "data.note.cinder.early": "Indgang fra 21.30",
  "data.note.cinder.standard": "Indgang når dørene åbner 22.00",
  "data.note.static.early": "Indgang fra 20.30",
  "data.note.static.standard": "Indgang når dørene åbner 21.00",
  "data.note.hollow.early": "Indgang fra 20.30",
  "data.note.hollow.standard": "Indgang når dørene åbner 21.00",
  "data.note.week.weekend": "Begge dage · begge sale",
  "data.note.week.day": "Én dag · begge sale",

  /* --- show descriptions --- */
  "data.desc.neon":
    "En sensommer-klubaften bygget op om modulær hardware og en meget høj sal. Forvent lange opbygninger, strobeskyllede drops og et PA-anlæg i Store Sal, der gør præcis det, det er hyret til.",
  "data.desc.velvet":
    "Annekset bliver stille for en enkelt aften: to stemmer, en båndoptager og levende lys, som brandinspektøren har godkendt. Unplugged, uden hastværk, helt tæt på.",
  "data.desc.cinder":
    "Cinder spiller »Slow Furnace« fra ende til anden og brænder derefter resten af natten af sammen med venner bag pladespillerne, indtil der lukkes.",
  "data.desc.static":
    "Broken beat-residenciet er tilbage. Hver udgave er blevet udsolgt, og denne her gik på elleve dage. Har du en billet, så pas godt på den.",
  "data.desc.hollow":
    "Dybt, langsomt og nedsænket — anlægget i Annekset er tunet til sub-bas, som du mærker i ribbenene et øjeblik før du hører den.",
  "data.desc.week":
    "Vores lille festival: fjorten navne over to dage i begge sale, food trucks i gården og det fælles afslutningssæt søndag aften, der lukker sæsonen.",
} satisfies Record<keyof typeof EN, string>;

/** 简体中文。 */
const ZH_CN = {
  /* --- what kind of night it is --- */
  "data.sub.club": "俱乐部之夜",
  "data.sub.acoustic": "原声之夜",
  "data.sub.release": "新专辑发行之夜",
  "data.sub.festival": "两天 · 两个厅",

  /* --- the two rooms --- */
  "data.room.main": "主厅",
  "data.room.annex": "侧厅",
  "data.room.both": "主厅 + 侧厅",

  /* --- ticket types --- */
  "data.tt.early": "提前入场",
  "data.tt.standard": "标准票",
  "data.tt.balcony": "楼上区",
  "data.tt.supporter": "支持者票",
  "data.tt.weekend": "周末通票",
  "data.tt.saturday": "周六",
  "data.tt.sunday": "周日",

  /* --- ticket-type notes --- */
  "data.note.balcony": "高处楼上区 · 独立吧台",
  "data.note.neon.early": "19:30 起入场 · 免去排队",
  "data.note.neon.standard": "20:00 开门后入场",
  "data.note.velvet.early": "18:30 起入场",
  "data.note.velvet.standard": "19:00 开门后入场",
  "data.note.velvet.supporter": "含亲笔签名海报",
  "data.note.cinder.early": "21:30 起入场",
  "data.note.cinder.standard": "22:00 开门后入场",
  "data.note.static.early": "20:30 起入场",
  "data.note.static.standard": "21:00 开门后入场",
  "data.note.hollow.early": "20:30 起入场",
  "data.note.hollow.standard": "21:00 开门后入场",
  "data.note.week.weekend": "两天全程 · 两个厅",
  "data.note.week.day": "单日 · 两个厅",

  /* --- show descriptions --- */
  "data.desc.neon":
    "一场夏末俱乐部之夜，围绕模块合成器和一个非常吵的厅打造。请准备好漫长的铺陈、频闪灯洗过的 drop，以及主厅那套音响拿出全部本事。",
  "data.desc.velvet":
    "侧厅安静一晚：两把嗓子、一台开盘机，还有消防员点头放行的蜡烛。不插电，不赶时间，离得很近。",
  "data.desc.cinder":
    "Cinder 将《Slow Furnace》从头到尾完整演出，随后与朋友接手唱机，把剩下的夜晚一路烧到打烊。",
  "data.desc.static":
    "碎拍驻场系列回归。每一届都售罄，这一届只用了十一天。手里有票的，看好了。",
  "data.desc.hollow":
    "低沉、缓慢、沉入水下——侧厅的音响为超低频而调，你会先在肋骨里感觉到它，再听见它。",
  "data.desc.week":
    "我们的小型音乐节：两天、两个厅、十四组演出，院子里有餐车，周日晚上还有全员合体的收官演出，为这一季画上句号。",
} satisfies Record<keyof typeof EN, string>;

/** 繁體中文（台灣）。獨立翻譯，非簡繁轉換。 */
const ZH_TW = {
  /* --- what kind of night it is --- */
  "data.sub.club": "俱樂部之夜",
  "data.sub.acoustic": "不插電之夜",
  "data.sub.release": "新專輯發行之夜",
  "data.sub.festival": "兩天 · 兩個廳",

  /* --- the two rooms --- */
  "data.room.main": "主廳",
  "data.room.annex": "側廳",
  "data.room.both": "主廳 + 側廳",

  /* --- ticket types --- */
  "data.tt.early": "提前入場",
  "data.tt.standard": "標準票",
  "data.tt.balcony": "樓上區",
  "data.tt.supporter": "支持者票",
  "data.tt.weekend": "週末通行證",
  "data.tt.saturday": "週六",
  "data.tt.sunday": "週日",

  /* --- ticket-type notes --- */
  "data.note.balcony": "高處樓上區 · 獨立吧台",
  "data.note.neon.early": "19:30 起入場 · 免去排隊",
  "data.note.neon.standard": "20:00 開門後入場",
  "data.note.velvet.early": "18:30 起入場",
  "data.note.velvet.standard": "19:00 開門後入場",
  "data.note.velvet.supporter": "含親筆簽名海報",
  "data.note.cinder.early": "21:30 起入場",
  "data.note.cinder.standard": "22:00 開門後入場",
  "data.note.static.early": "20:30 起入場",
  "data.note.static.standard": "21:00 開門後入場",
  "data.note.hollow.early": "20:30 起入場",
  "data.note.hollow.standard": "21:00 開門後入場",
  "data.note.week.weekend": "兩天全程 · 兩個廳",
  "data.note.week.day": "單日 · 兩個廳",

  /* --- show descriptions --- */
  "data.desc.neon":
    "一場夏末俱樂部之夜，圍繞模組合成器與一個非常吵的廳打造。請準備好漫長的鋪陳、頻閃燈洗過的 drop，以及主廳那套音響拿出全部本事。",
  "data.desc.velvet":
    "側廳安靜一晚：兩把嗓子、一台盤帶機，還有消防人員點頭放行的蠟燭。不插電，不趕時間，離得很近。",
  "data.desc.cinder":
    "Cinder 將《Slow Furnace》從頭到尾完整演出，接著與朋友接手唱機，把剩下的夜晚一路燒到打烊。",
  "data.desc.static":
    "碎拍駐場系列回歸。每一屆都完售，這一屆只花了十一天。手裡有票的，看好了。",
  "data.desc.hollow":
    "低沉、緩慢、沉入水下——側廳的音響為超低頻而調，你會先在肋骨裡感覺到它，再聽見它。",
  "data.desc.week":
    "我們的小型音樂節：兩天、兩個廳、十四組演出，院子裡有餐車，週日晚上還有全員合體的收官演出，為這一季畫上句點。",
} satisfies Record<keyof typeof EN, string>;

/** العربية (مصر). أرقام لاتينية هنا؛ Intl هو من يحوّلها وقت العرض. */
const AR_EG = {
  /* --- what kind of night it is --- */
  "data.sub.club": "ليلة كلوب",
  "data.sub.acoustic": "أمسية أكوستيك",
  "data.sub.release": "ليلة إطلاق الألبوم",
  "data.sub.festival": "يومان · القاعتان",

  /* --- the two rooms --- */
  "data.room.main": "القاعة الكبرى",
  "data.room.annex": "الملحق",
  "data.room.both": "القاعة الكبرى + الملحق",

  /* --- ticket types --- */
  "data.tt.early": "دخول مبكر",
  "data.tt.standard": "دخول عادي",
  "data.tt.balcony": "الشرفة",
  "data.tt.supporter": "تذكرة الداعم",
  "data.tt.weekend": "تصريح نهاية الأسبوع",
  "data.tt.saturday": "السبت",
  "data.tt.sunday": "الأحد",

  /* --- ticket-type notes --- */
  "data.note.balcony": "شرفة مرتفعة · بار خاص بها",
  "data.note.neon.early": "الدخول من 19:30 · قبل الطابور",
  "data.note.neon.standard": "الدخول مع فتح الأبواب 20:00",
  "data.note.velvet.early": "الدخول من 18:30",
  "data.note.velvet.standard": "الدخول مع فتح الأبواب 19:00",
  "data.note.velvet.supporter": "يشمل ملصقًا موقّعًا",
  "data.note.cinder.early": "الدخول من 21:30",
  "data.note.cinder.standard": "الدخول مع فتح الأبواب 22:00",
  "data.note.static.early": "الدخول من 20:30",
  "data.note.static.standard": "الدخول مع فتح الأبواب 21:00",
  "data.note.hollow.early": "الدخول من 20:30",
  "data.note.hollow.standard": "الدخول مع فتح الأبواب 21:00",
  "data.note.week.weekend": "اليومان · القاعتان",
  "data.note.week.day": "يوم واحد · القاعتان",

  /* --- show descriptions --- */
  "data.desc.neon":
    "ليلة كلوب في أواخر الصيف قائمة على أجهزة مودولار وقاعة عالية الصوت. توقّع بناءً طويلاً، ودروبات تغسلها أضواء الستروب، ونظام صوت القاعة الكبرى وهو يفعل بالضبط ما جيء به من أجله.",
  "data.desc.velvet":
    "الملحق يهدأ لليلة واحدة: صوتان، وجهاز تسجيل شرائط، وشموع وافق عليها مسؤول الإطفاء. بلا تكبير، وعلى مهل، وعن قرب.",
  "data.desc.cinder":
    "فرقة Cinder تعزف «Slow Furnace» كاملاً من أوله إلى آخره، ثم تُشعل بقية الليلة مع أصدقاء خلف الأقراص حتى الإغلاق.",
  "data.desc.static":
    "إقامة البروكن بيت تعود من جديد. كل نسخة نفدت تذاكرها، وهذه نفدت في أحد عشر يومًا. لو معك تذكرة، حافظ عليها جيدًا.",
  "data.desc.hollow":
    "عميق وبطيء وغارق — أجهزة الملحق مضبوطة على ترددات باس منخفضة تحسّها في ضلوعك قبل أن تسمعها بلحظة.",
  "data.desc.week":
    "مهرجاننا الصغير: أربعة عشر عرضًا على مدى يومين في القاعتين، وعربات طعام في الفناء، ثم عرض الختام الجماعي مساء الأحد الذي يُنهي الموسم.",
} satisfies Record<keyof typeof EN, string>;

export const data = {
  "en-US": EN,
  "de-DE": DE,
  "fr-FR": FR,
  "cs-CZ": CS,
  "da-DK": DA,
  "zh-CN": ZH_CN,
  "zh-TW": ZH_TW,
  "ar-EG": AR_EG,
} satisfies Record<LocaleTag, Record<string, string>>;
