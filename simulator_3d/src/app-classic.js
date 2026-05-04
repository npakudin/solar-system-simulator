import { SolarPhysics, setLdemImageData } from './physics-classic.js';
import { RocketSim as rocketSim } from './rocket-classic.js';
import { SolarScenarioData } from './scenario-data.js';
import { MeshFactory } from './mesh-factory.js';
import { formatDuration, formatElapsedTime, formatCountdown, formatDist } from './time-format.js';
import { computeLaunchWindowForBodies, computeLaunchWindowFromState as computeLaunchWindowFromOrbitalState } from './launch-window.js';

const {
  constants,
  checkLandings,
  createInitialBodies,
  distance,
  getScenario,
  getScenarios,
  launchRocket,
  speed,
  stepSimulation
} = SolarPhysics;

  const canvas = document.querySelector("#scene");
  const panel = document.querySelector(".panel");
  const advancedControls = document.querySelector(".advanced");
  const scenarioSelect = document.querySelector("#scenario-select");
  const runButton = document.querySelector("#toggle-run");
  const panelToggleButton = document.querySelector("#toggle-panel");
  const languageSelect = document.querySelector("#language-select");
  const cameraTargetSelect = document.querySelector("#camera-target");
  const dynamicTimeScaleInput = document.querySelector("#dynamic-time-scale");
  const timeScaleInput = document.querySelector("#time-scale");
  const timeScaleNum = document.querySelector("#time-scale-num");

  const TS_LOG_MIN = Math.log10(0.1);
  const TS_LOG_MAX = Math.log10(10000);

  function sliderToTimeScale(pos) {
    return Math.pow(10, TS_LOG_MIN + (Number(pos) / 1000) * (TS_LOG_MAX - TS_LOG_MIN));
  }

  function timeScaleToSlider(ts) {
    return Math.round((Math.log10(Math.max(Number(ts), 0.1)) - TS_LOG_MIN) / (TS_LOG_MAX - TS_LOG_MIN) * 1000);
  }

  function fmtTimeScale(ts) {
    return ts < 10 ? parseFloat(ts.toPrecision(2)) : Math.round(ts);
  }

  function clampTimeScale(value) {
    return Math.min(TIME_SCALE_MAX, Math.max(TIME_SCALE_MIN, Number(value)));
  }

  function t(key, vars = {}) {
    const text = (UI_TEXT[currentLanguage] && UI_TEXT[currentLanguage][key]) || UI_TEXT.en[key] || key;
    return Object.entries(vars).reduce((result, [name, value]) => (
      result.replaceAll(`{${name}}`, value)
    ), text);
  }

  function chooseInitialLanguage() {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (UI_TEXT[stored]) {
      return stored;
    }
    const browserLanguages = navigator.languages || [navigator.language || "en"];
    for (const browserLanguage of browserLanguages) {
      const normalized = browserLanguage.toLowerCase();
      const base = normalized.split("-")[0];
      if (normalized.startsWith("zh")) return "zh";
      if (base === "tl") return "fil";
      if (UI_TEXT[base]) return base;
    }
    return "en";
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) {
      el.textContent = text;
    }
  }

  function applyLanguage() {
    if (languageSelect) {
      languageSelect.replaceChildren();
      const languageOptions = Object.entries(LANGUAGE_NAMES)
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
      for (const [value, label] of languageOptions) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        languageSelect.append(option);
      }
      languageSelect.value = currentLanguage;
    }
    updateRunButtonText();
    setText(".advanced summary", t("advanced"));
    setText("#scenario-label", t("scenario"));
    setText("#timescale-label", t("timescale"));
    setText("#camera-label", t("camera"));
    setText("#language-label", t("language"));
    setText("#auto-speed-label", t("autoSpeed"));
    setText("#trails-label", t("trails"));
    setText("#sim-time-label", t("simTime"));
    setText("#target-distance-label", t("distanceToNextTarget"));
    setText("#speed-to-target-label", t("approachSpeed"));
    setText("#mission-time-label", t("flightTime"));
    setText("#flight-phase-label", t("shipAction"));
    setText("#next-burn-label", t("nextBurn"));
    setText("#engine-power-label", t("enginePower"));
    setText("#fuel-label", t("fuelLeft"));
    setText("#orbit-inclination-label", t("orbitTilt"));
    setText(".compact-readout div:nth-child(1) dt", t("timeCompact"));
    setText(".compact-readout div:nth-child(2) dt", t("speedCompact"));
    syncScenarioOptions();
    syncCameraOptions();
  }
  const showTrailsInput = document.querySelector("#show-trails");
  const timeReadout = document.querySelector("#time-readout");
  const targetDistanceLabel = document.querySelector("#target-distance-label");
  const targetDistanceReadout = document.querySelector("#target-distance");
  const speedToTargetReadout = document.querySelector("#speed-to-target");
  const missionTimeReadout = document.querySelector("#mission-time");
  const flightPhaseReadout = document.querySelector("#flight-phase");
  const nextBurnReadout = document.querySelector("#next-burn-readout");
  const throttleReadout = document.querySelector("#throttle-readout");
  const fuelReadout = document.querySelector("#fuel-readout");
  const orbitInclinationReadout = document.querySelector("#orbit-inclination");
  const compactMissionTimeReadout = document.querySelector("#compact-mission-time");
  const compactRocketSpeedReadout = document.querySelector("#compact-rocket-speed");
  let scenarioSelectValueBeforeOpen = "";
  let scenarioChangedWhileOpen = false;
  const LANGUAGE_STORAGE_KEY = "planets3d.language";
  const UI_TEXT = {
    en: {
      start: "Start",
      stop: "Stop",
      restart: "Restart",
      advanced: "Advanced",
      language: "Language",
      scenario: "Scenario",
      timescale: "Timescale",
      camera: "Camera",
      autoSpeed: "Auto speed",
      trails: "Trails",
      simTime: "Simulation time",
      distanceToTarget: "Distance to {target}",
      distanceToNextTarget: "Distance to target",
      approachSpeed: "Approach speed",
      flightTime: "Mission time",
      shipAction: "What the ship is doing",
      nextBurn: "Next engine burn",
      enginePower: "Engine power",
      fuelLeft: "Fuel left",
      orbitTilt: "Orbit tilt vs Earth's path",
      target: "Target",
      none: "none",
      noData: "n/a",
      noMoreBurns: "No more planned burns",
      ready: "Ready to launch",
      notLaunched: "not launched",
      coasting: "Flying without engine thrust",
      firing: "Engine is firing",
      nextBurnIn: "{name} in {time}",
      targetTilt: "target {deg} deg",
      speedCompact: "Speed",
      timeCompact: "Time",
      freeCamera: "Free"
    },
    ru: {
      start: "Старт",
      stop: "Стоп",
      restart: "Заново",
      advanced: "Дополнительно",
      language: "Язык",
      scenario: "Сценарий",
      timescale: "Масштаб времени",
      camera: "Камера",
      autoSpeed: "Автоскорость",
      trails: "Следы",
      simTime: "Время симуляции",
      distanceToTarget: "Расстояние до {target}",
      distanceToNextTarget: "Расстояние до цели",
      approachSpeed: "Скорость сближения",
      flightTime: "Время миссии",
      shipAction: "Что делает корабль",
      nextBurn: "Следующий маневр",
      enginePower: "Мощность двигателя",
      fuelLeft: "Остаток топлива",
      orbitTilt: "Наклон орбиты к пути Земли",
      target: "Цель",
      none: "нет",
      noData: "нет данных",
      noMoreBurns: "Больше маневров нет",
      ready: "Готов к запуску",
      notLaunched: "не запущен",
      coasting: "Летит без тяги двигателя",
      firing: "Двигатель работает",
      nextBurnIn: "{name} через {time}",
      targetTilt: "цель {deg} град",
      speedCompact: "Скорость",
      timeCompact: "Время",
      freeCamera: "Свободная"
    }
  };
  Object.assign(UI_TEXT, {
    fil: { start: "Simulan", stop: "Ihinto", restart: "Ulitin", advanced: "Dagdag", language: "Wika", scenario: "Senaryo", timescale: "Bilis ng oras", camera: "Kamera", autoSpeed: "Auto bilis", trails: "Mga bakas", simTime: "Oras ng simulation", distanceToTarget: "Layo sa {target}", distanceToNextTarget: "Layo sa target", approachSpeed: "Bilis ng lapit", flightTime: "Oras ng misyon", shipAction: "Ginagawa ng barko", nextBurn: "Susunod na sindi", enginePower: "Lakas ng makina", fuelLeft: "Natitirang fuel", orbitTilt: "Ikiling ng orbit vs daan ng Earth", noData: "wala", noMoreBurns: "Wala nang planong sindi", ready: "Handa ilunsad", notLaunched: "di pa nailulunsad", coasting: "Lumulutang nang walang tulak", firing: "Umaandar ang makina", nextBurnIn: "{name} sa {time}", targetTilt: "target {deg} deg", speedCompact: "Bilis", timeCompact: "Oras", freeCamera: "Malaya" },
    id: { start: "Mulai", stop: "Berhenti", restart: "Ulangi", advanced: "Lanjutan", language: "Bahasa", scenario: "Skenario", timescale: "Skala waktu", camera: "Kamera", autoSpeed: "Kecepatan otomatis", trails: "Jejak", simTime: "Waktu simulasi", distanceToTarget: "Jarak ke {target}", distanceToNextTarget: "Jarak ke target", approachSpeed: "Kecepatan mendekat", flightTime: "Waktu misi", shipAction: "Yang dilakukan wahana", nextBurn: "Manuver mesin berikutnya", enginePower: "Daya mesin", fuelLeft: "Sisa bahan bakar", orbitTilt: "Kemiringan orbit vs lintasan Bumi", noData: "tidak ada", noMoreBurns: "Tidak ada manuver lagi", ready: "Siap diluncurkan", notLaunched: "belum diluncurkan", coasting: "Melayang tanpa dorongan mesin", firing: "Mesin menyala", nextBurnIn: "{name} dalam {time}", targetTilt: "target {deg} deg", speedCompact: "Kecepatan", timeCompact: "Waktu", freeCamera: "Bebas" },
    zh: { start: "开始", stop: "停止", restart: "重新开始", advanced: "高级", language: "语言", scenario: "场景", timescale: "时间倍率", camera: "相机", autoSpeed: "自动速度", trails: "轨迹", simTime: "模拟时间", distanceToTarget: "到{target}的距离", distanceToNextTarget: "到目标的距离", approachSpeed: "接近速度", flightTime: "任务时间", shipAction: "飞船正在做什么", nextBurn: "下一次点火", enginePower: "发动机功率", fuelLeft: "剩余燃料", orbitTilt: "轨道相对地球公转面的倾角", noData: "无", noMoreBurns: "没有计划点火", ready: "准备发射", notLaunched: "未发射", coasting: "无推力滑行", firing: "发动机正在工作", nextBurnIn: "{time}后{name}", targetTilt: "目标 {deg} 度", speedCompact: "速度", timeCompact: "时间", freeCamera: "自由" },
    ko: { start: "시작", stop: "정지", restart: "다시 시작", advanced: "고급", language: "언어", scenario: "시나리오", timescale: "시간 배율", camera: "카메라", autoSpeed: "자동 속도", trails: "궤적", simTime: "시뮬레이션 시간", distanceToTarget: "{target}까지 거리", distanceToNextTarget: "목표까지 거리", approachSpeed: "접근 속도", flightTime: "임무 시간", shipAction: "우주선 상태", nextBurn: "다음 엔진 점화", enginePower: "엔진 출력", fuelLeft: "남은 연료", orbitTilt: "지구 궤도면 대비 기울기", noData: "없음", noMoreBurns: "예정된 점화 없음", ready: "발사 준비", notLaunched: "미발사", coasting: "엔진 추력 없이 비행", firing: "엔진 작동 중", nextBurnIn: "{time} 후 {name}", targetTilt: "목표 {deg}도", speedCompact: "속도", timeCompact: "시간", freeCamera: "자유" },
    ja: { start: "開始", stop: "停止", restart: "再開", advanced: "詳細", language: "言語", scenario: "シナリオ", timescale: "時間倍率", camera: "カメラ", autoSpeed: "自動速度", trails: "軌跡", simTime: "シミュレーション時間", distanceToTarget: "{target}までの距離", distanceToNextTarget: "目標までの距離", approachSpeed: "接近速度", flightTime: "ミッション時間", shipAction: "宇宙船の状態", nextBurn: "次のエンジン噴射", enginePower: "エンジン出力", fuelLeft: "残り燃料", orbitTilt: "地球の軌道面からの傾き", noData: "なし", noMoreBurns: "予定された噴射なし", ready: "発射準備完了", notLaunched: "未発射", coasting: "エンジン推力なしで飛行中", firing: "エンジン作動中", nextBurnIn: "{time}後に{name}", targetTilt: "目標 {deg} 度", speedCompact: "速度", timeCompact: "時間", freeCamera: "自由" },
    es: { start: "Iniciar", stop: "Parar", restart: "Reiniciar", advanced: "Avanzado", language: "Idioma", scenario: "Escenario", timescale: "Escala de tiempo", camera: "Cámara", autoSpeed: "Velocidad auto", trails: "Estelas", simTime: "Tiempo de simulación", distanceToTarget: "Distancia a {target}", distanceToNextTarget: "Distancia al objetivo", approachSpeed: "Velocidad de aproximación", flightTime: "Tiempo de misión", shipAction: "Qué hace la nave", nextBurn: "Próximo encendido", enginePower: "Potencia del motor", fuelLeft: "Combustible restante", orbitTilt: "Inclinación vs órbita terrestre", noData: "n/d", noMoreBurns: "No hay más encendidos", ready: "Listo para lanzar", notLaunched: "sin lanzar", coasting: "Volando sin empuje", firing: "Motor encendido", nextBurnIn: "{name} en {time}", targetTilt: "objetivo {deg}°", speedCompact: "Velocidad", timeCompact: "Tiempo", freeCamera: "Libre" },
    fr: { start: "Démarrer", stop: "Arrêter", restart: "Redémarrer", advanced: "Avancé", language: "Langue", scenario: "Scénario", timescale: "Échelle de temps", camera: "Caméra", autoSpeed: "Vitesse auto", trails: "Traînées", simTime: "Temps de simulation", distanceToTarget: "Distance vers {target}", distanceToNextTarget: "Distance vers la cible", approachSpeed: "Vitesse d'approche", flightTime: "Temps de mission", shipAction: "Ce que fait le vaisseau", nextBurn: "Prochaine poussée", enginePower: "Puissance moteur", fuelLeft: "Carburant restant", orbitTilt: "Inclinaison vs trajet terrestre", noData: "n/d", noMoreBurns: "Plus de poussées prévues", ready: "Prêt au lancement", notLaunched: "pas lancé", coasting: "Vol sans poussée", firing: "Moteur allumé", nextBurnIn: "{name} dans {time}", targetTilt: "cible {deg}°", speedCompact: "Vitesse", timeCompact: "Temps", freeCamera: "Libre" },
    de: { start: "Start", stop: "Stopp", restart: "Neustart", advanced: "Erweitert", language: "Sprache", scenario: "Szenario", timescale: "Zeitskala", camera: "Kamera", autoSpeed: "Auto-Tempo", trails: "Spuren", simTime: "Simulationszeit", distanceToTarget: "Entfernung zu {target}", distanceToNextTarget: "Entfernung zum Ziel", approachSpeed: "Annäherung", flightTime: "Missionszeit", shipAction: "Was das Schiff tut", nextBurn: "Nächster Triebwerksbrand", enginePower: "Triebwerksleistung", fuelLeft: "Treibstoff übrig", orbitTilt: "Neigung zur Erdbahnebene", noData: "k. A.", noMoreBurns: "Keine weiteren Manöver", ready: "Startbereit", notLaunched: "nicht gestartet", coasting: "Flug ohne Schub", firing: "Triebwerk läuft", nextBurnIn: "{name} in {time}", targetTilt: "Ziel {deg}°", speedCompact: "Tempo", timeCompact: "Zeit", freeCamera: "Frei" },
    pt: { start: "Iniciar", stop: "Parar", restart: "Reiniciar", advanced: "Avançado", language: "Idioma", scenario: "Cenário", timescale: "Escala de tempo", camera: "Câmera", autoSpeed: "Velocidade auto", trails: "Rastros", simTime: "Tempo da simulação", distanceToTarget: "Distância até {target}", distanceToNextTarget: "Distância até o alvo", approachSpeed: "Velocidade de aproximação", flightTime: "Tempo da missão", shipAction: "O que a nave faz", nextBurn: "Próxima queima", enginePower: "Potência do motor", fuelLeft: "Combustível restante", orbitTilt: "Inclinação vs caminho da Terra", noData: "n/d", noMoreBurns: "Sem mais queimas planejadas", ready: "Pronto para lançar", notLaunched: "não lançado", coasting: "Voando sem empuxo", firing: "Motor ligado", nextBurnIn: "{name} em {time}", targetTilt: "alvo {deg}°", speedCompact: "Velocidade", timeCompact: "Tempo", freeCamera: "Livre" },
    hi: { start: "शुरू", stop: "रोकें", restart: "फिर शुरू", advanced: "उन्नत", language: "भाषा", scenario: "दृश्य", timescale: "समय पैमाना", camera: "कैमरा", autoSpeed: "ऑटो गति", trails: "पथ", simTime: "सिमुलेशन समय", distanceToTarget: "{target} तक दूरी", distanceToNextTarget: "लक्ष्य तक दूरी", approachSpeed: "नजदीक आने की गति", flightTime: "मिशन समय", shipAction: "यान क्या कर रहा है", nextBurn: "अगला इंजन बर्न", enginePower: "इंजन शक्ति", fuelLeft: "बचा ईंधन", orbitTilt: "पृथ्वी पथ से कक्षा झुकाव", noData: "नहीं", noMoreBurns: "और बर्न नहीं", ready: "लॉन्च के लिए तैयार", notLaunched: "लॉन्च नहीं", coasting: "बिना इंजन धक्का उड़ान", firing: "इंजन चल रहा है", nextBurnIn: "{time} में {name}", targetTilt: "लक्ष्य {deg} deg", speedCompact: "गति", timeCompact: "समय", freeCamera: "मुक्त" },
    tr: { start: "Başlat", stop: "Durdur", restart: "Yeniden başlat", advanced: "Gelişmiş", language: "Dil", scenario: "Senaryo", timescale: "Zaman ölçeği", camera: "Kamera", autoSpeed: "Oto hız", trails: "İzler", simTime: "Simülasyon zamanı", distanceToTarget: "{target} mesafesi", distanceToNextTarget: "Hedefe mesafe", approachSpeed: "Yaklaşma hızı", flightTime: "Görev süresi", shipAction: "Araç ne yapıyor", nextBurn: "Sonraki motor ateşi", enginePower: "Motor gücü", fuelLeft: "Kalan yakıt", orbitTilt: "Dünya yoluna göre yörünge eğimi", noData: "yok", noMoreBurns: "Planlı ateşleme yok", ready: "Fırlatmaya hazır", notLaunched: "fırlatılmadı", coasting: "Motorsuz süzülüyor", firing: "Motor çalışıyor", nextBurnIn: "{name} {time} içinde", targetTilt: "hedef {deg}°", speedCompact: "Hız", timeCompact: "Zaman", freeCamera: "Serbest" },
    vi: { start: "Bắt đầu", stop: "Dừng", restart: "Chạy lại", advanced: "Nâng cao", language: "Ngôn ngữ", scenario: "Kịch bản", timescale: "Tỷ lệ thời gian", camera: "Camera", autoSpeed: "Tốc độ tự động", trails: "Vệt bay", simTime: "Thời gian mô phỏng", distanceToTarget: "Khoảng cách tới {target}", distanceToNextTarget: "Khoảng cách tới mục tiêu", approachSpeed: "Tốc độ tiếp cận", flightTime: "Thời gian nhiệm vụ", shipAction: "Tàu đang làm gì", nextBurn: "Lần đốt động cơ tiếp theo", enginePower: "Công suất động cơ", fuelLeft: "Nhiên liệu còn lại", orbitTilt: "Độ nghiêng quỹ đạo so với đường Trái Đất", noData: "không có", noMoreBurns: "Không còn lần đốt nào", ready: "Sẵn sàng phóng", notLaunched: "chưa phóng", coasting: "Bay không dùng lực đẩy", firing: "Động cơ đang chạy", nextBurnIn: "{name} sau {time}", targetTilt: "mục tiêu {deg} độ", speedCompact: "Tốc độ", timeCompact: "Thời gian", freeCamera: "Tự do" },
    th: { start: "เริ่ม", stop: "หยุด", restart: "เริ่มใหม่", advanced: "ขั้นสูง", language: "ภาษา", scenario: "สถานการณ์", timescale: "สเกลเวลา", camera: "กล้อง", autoSpeed: "ความเร็วอัตโนมัติ", trails: "เส้นทาง", simTime: "เวลาจำลอง", distanceToTarget: "ระยะถึง {target}", distanceToNextTarget: "ระยะถึงเป้าหมาย", approachSpeed: "ความเร็วเข้าใกล้", flightTime: "เวลาภารกิจ", shipAction: "ยานกำลังทำอะไร", nextBurn: "จุดเครื่องครั้งถัดไป", enginePower: "กำลังเครื่องยนต์", fuelLeft: "เชื้อเพลิงเหลือ", orbitTilt: "เอียงวงโคจรเทียบทางโลก", noData: "ไม่มี", noMoreBurns: "ไม่มีการจุดเครื่องเพิ่ม", ready: "พร้อมปล่อย", notLaunched: "ยังไม่ปล่อย", coasting: "บินโดยไม่มีแรงขับ", firing: "เครื่องยนต์ทำงาน", nextBurnIn: "{name} ใน {time}", targetTilt: "เป้าหมาย {deg} องศา", speedCompact: "ความเร็ว", timeCompact: "เวลา", freeCamera: "อิสระ" },
    it: { start: "Avvia", stop: "Ferma", restart: "Riavvia", advanced: "Avanzato", language: "Lingua", scenario: "Scenario", timescale: "Scala tempo", camera: "Camera", autoSpeed: "Velocità auto", trails: "Scie", simTime: "Tempo di simulazione", distanceToTarget: "Distanza da {target}", distanceToNextTarget: "Distanza dal target", approachSpeed: "Velocità di avvicinamento", flightTime: "Tempo missione", shipAction: "Cosa fa la nave", nextBurn: "Prossima accensione", enginePower: "Potenza motore", fuelLeft: "Carburante rimasto", orbitTilt: "Inclinazione rispetto all'orbita terrestre", noData: "n/d", noMoreBurns: "Nessuna accensione prevista", ready: "Pronto al lancio", notLaunched: "non lanciato", coasting: "Volo senza spinta", firing: "Motore acceso", nextBurnIn: "{name} tra {time}", targetTilt: "target {deg}°", speedCompact: "Velocità", timeCompact: "Tempo", freeCamera: "Libera" },
    pl: { start: "Start", stop: "Stop", restart: "Restart", advanced: "Zaawansowane", language: "Język", scenario: "Scenariusz", timescale: "Skala czasu", camera: "Kamera", autoSpeed: "Auto prędkość", trails: "Ślady", simTime: "Czas symulacji", distanceToTarget: "Odległość do {target}", distanceToNextTarget: "Odległość do celu", approachSpeed: "Prędkość zbliżania", flightTime: "Czas misji", shipAction: "Co robi statek", nextBurn: "Następne odpalenie", enginePower: "Moc silnika", fuelLeft: "Pozostałe paliwo", orbitTilt: "Nachylenie względem drogi Ziemi", noData: "brak", noMoreBurns: "Brak dalszych odpaleń", ready: "Gotowy do startu", notLaunched: "nie wystartował", coasting: "Lot bez ciągu", firing: "Silnik pracuje", nextBurnIn: "{name} za {time}", targetTilt: "cel {deg}°", speedCompact: "Prędkość", timeCompact: "Czas", freeCamera: "Wolna" },
    nl: { start: "Start", stop: "Stop", restart: "Restart", advanced: "Geavanceerd", language: "Taal", scenario: "Scenario", timescale: "Tijdschaal", camera: "Camera", autoSpeed: "Auto snelheid", trails: "Sporen", simTime: "Simulatietijd", distanceToTarget: "Afstand tot {target}", distanceToNextTarget: "Afstand tot doel", approachSpeed: "Naderingssnelheid", flightTime: "Missietijd", shipAction: "Wat het schip doet", nextBurn: "Volgende motorbrand", enginePower: "Motorvermogen", fuelLeft: "Brandstof over", orbitTilt: "Baanhelling t.o.v. aardpad", noData: "n.v.t.", noMoreBurns: "Geen geplande burns", ready: "Klaar voor lancering", notLaunched: "niet gelanceerd", coasting: "Vliegt zonder stuwkracht", firing: "Motor draait", nextBurnIn: "{name} over {time}", targetTilt: "doel {deg}°", speedCompact: "Snelheid", timeCompact: "Tijd", freeCamera: "Vrij" },
    sv: { start: "Starta", stop: "Stoppa", restart: "Starta om", advanced: "Avancerat", language: "Språk", scenario: "Scenario", timescale: "Tidsskala", camera: "Kamera", autoSpeed: "Auto-hastighet", trails: "Spår", simTime: "Simuleringstid", distanceToTarget: "Avstånd till {target}", distanceToNextTarget: "Avstånd till mål", approachSpeed: "Närmandehastighet", flightTime: "Uppdragstid", shipAction: "Vad farkosten gör", nextBurn: "Nästa motorbränning", enginePower: "Motorkraft", fuelLeft: "Bränsle kvar", orbitTilt: "Banlutning mot jordens väg", noData: "saknas", noMoreBurns: "Inga fler planerade bränningar", ready: "Klar för uppskjutning", notLaunched: "inte uppskjuten", coasting: "Flyger utan dragkraft", firing: "Motorn kör", nextBurnIn: "{name} om {time}", targetTilt: "mål {deg}°", speedCompact: "Hastighet", timeCompact: "Tid", freeCamera: "Fri" },
    kk: { start: "Бастау", stop: "Тоқтату", restart: "Қайта бастау", advanced: "Қосымша", language: "Тіл", scenario: "Сценарий", timescale: "Уақыт масштабы", camera: "Камера", autoSpeed: "Авто жылдамдық", trails: "Іздер", simTime: "Симуляция уақыты", distanceToTarget: "{target} дейін қашықтық", distanceToNextTarget: "Мақсатқа дейін қашықтық", approachSpeed: "Жақындау жылдамдығы", flightTime: "Миссия уақыты", shipAction: "Кеме не істеп жатыр", nextBurn: "Келесі қозғалтқыш маневрі", enginePower: "Қозғалтқыш қуаты", fuelLeft: "Қалған отын", orbitTilt: "Орбитаның Жер жолына көлбеуі", noData: "жоқ", noMoreBurns: "Жоспарланған маневр жоқ", ready: "Ұшыруға дайын", notLaunched: "ұшырылмаған", coasting: "Тартусыз ұшып барады", firing: "Қозғалтқыш жұмыс істеп тұр", nextBurnIn: "{name} {time} кейін", targetTilt: "мақсат {deg} град", speedCompact: "Жылдамдық", timeCompact: "Уақыт", freeCamera: "Еркін" },
    bg: { start: "Старт", stop: "Стоп", advanced: "Разширени", language: "Език", scenario: "Сценарий", timescale: "Мащаб на времето", camera: "Камера", autoSpeed: "Авто скорост", trails: "Следи", simTime: "Време на симулацията", distanceToTarget: "Разстояние до {target}", distanceToNextTarget: "Разстояние до целта", approachSpeed: "Скорост на приближаване", flightTime: "Време на мисията", shipAction: "Какво прави корабът", nextBurn: "Следващо запалване", enginePower: "Мощност на двигателя", fuelLeft: "Оставащо гориво", orbitTilt: "Наклон спрямо пътя на Земята", noData: "няма", noMoreBurns: "Няма планирани запалвания", ready: "Готов за старт", notLaunched: "не е изстрелян", coasting: "Лети без тяга", firing: "Двигателят работи", nextBurnIn: "{name} след {time}", targetTilt: "цел {deg}°", speedCompact: "Скорост", timeCompact: "Време", freeCamera: "Свободна" },
    cs: { start: "Start", stop: "Stop", restart: "Restart", advanced: "Pokročilé", language: "Jazyk", scenario: "Scénář", timescale: "Měřítko času", camera: "Kamera", autoSpeed: "Auto rychlost", trails: "Stopy", simTime: "Čas simulace", distanceToTarget: "Vzdálenost k {target}", distanceToNextTarget: "Vzdálenost k cíli", approachSpeed: "Rychlost přiblížení", flightTime: "Čas mise", shipAction: "Co loď dělá", nextBurn: "Další zážeh", enginePower: "Výkon motoru", fuelLeft: "Zbývá paliva", orbitTilt: "Sklon vůči dráze Země", noData: "není", noMoreBurns: "Žádné další zážehy", ready: "Připraveno ke startu", notLaunched: "neodstartováno", coasting: "Let bez tahu", firing: "Motor běží", nextBurnIn: "{name} za {time}", targetTilt: "cíl {deg}°", speedCompact: "Rychlost", timeCompact: "Čas", freeCamera: "Volná" },
    da: { start: "Start", stop: "Stop", restart: "Restart", advanced: "Avanceret", language: "Sprog", scenario: "Scenarie", timescale: "Tidsskala", camera: "Kamera", autoSpeed: "Auto hastighed", trails: "Spor", simTime: "Simuleringstid", distanceToTarget: "Afstand til {target}", distanceToNextTarget: "Afstand til mål", approachSpeed: "Tilnærmelseshastighed", flightTime: "Missionstid", shipAction: "Hvad fartøjet gør", nextBurn: "Næste motorbrænding", enginePower: "Motorkraft", fuelLeft: "Brændstof tilbage", orbitTilt: "Banehældning mod Jordens vej", noData: "ingen", noMoreBurns: "Ingen planlagte brændinger", ready: "Klar til opsendelse", notLaunched: "ikke opsendt", coasting: "Flyver uden tryk", firing: "Motoren kører", nextBurnIn: "{name} om {time}", targetTilt: "mål {deg}°", speedCompact: "Hastighed", timeCompact: "Tid", freeCamera: "Fri" },
    el: { start: "Έναρξη", stop: "Στοπ", restart: "Επανεκκίνηση", advanced: "Σύνθετα", language: "Γλώσσα", scenario: "Σενάριο", timescale: "Κλίμακα χρόνου", camera: "Κάμερα", autoSpeed: "Αυτόματη ταχύτητα", trails: "Ίχνη", simTime: "Χρόνος προσομοίωσης", distanceToTarget: "Απόσταση έως {target}", distanceToNextTarget: "Απόσταση έως στόχο", approachSpeed: "Ταχύτητα προσέγγισης", flightTime: "Χρόνος αποστολής", shipAction: "Τι κάνει το σκάφος", nextBurn: "Επόμενη καύση", enginePower: "Ισχύς κινητήρα", fuelLeft: "Καύσιμο που απομένει", orbitTilt: "Κλίση ως προς την πορεία της Γης", noData: "κανένα", noMoreBurns: "Δεν υπάρχουν άλλες καύσεις", ready: "Έτοιμο για εκτόξευση", notLaunched: "δεν εκτοξεύτηκε", coasting: "Πτήση χωρίς ώση", firing: "Ο κινητήρας λειτουργεί", nextBurnIn: "{name} σε {time}", targetTilt: "στόχος {deg}°", speedCompact: "Ταχύτητα", timeCompact: "Χρόνος", freeCamera: "Ελεύθερη" },
    fi: { start: "Aloita", stop: "Pysäytä", restart: "Käynnistä uudelleen", advanced: "Lisäasetukset", language: "Kieli", scenario: "Skenaario", timescale: "Aikaskaala", camera: "Kamera", autoSpeed: "Autonopeus", trails: "Jäljet", simTime: "Simulaatioaika", distanceToTarget: "Etäisyys kohteeseen {target}", distanceToNextTarget: "Etäisyys kohteeseen", approachSpeed: "Lähestymisnopeus", flightTime: "Tehtäväaika", shipAction: "Mitä alus tekee", nextBurn: "Seuraava moottoripoltto", enginePower: "Moottoriteho", fuelLeft: "Polttoainetta jäljellä", orbitTilt: "Radankaltevuus Maan rataan nähden", noData: "ei ole", noMoreBurns: "Ei suunniteltuja polttoja", ready: "Valmis laukaisuun", notLaunched: "ei laukaistu", coasting: "Lentää ilman työntöä", firing: "Moottori käy", nextBurnIn: "{name} ajassa {time}", targetTilt: "kohde {deg}°", speedCompact: "Nopeus", timeCompact: "Aika", freeCamera: "Vapaa" },
    hr: { start: "Start", stop: "Stop", restart: "Restart", advanced: "Napredno", language: "Jezik", scenario: "Scenarij", timescale: "Skala vremena", camera: "Kamera", autoSpeed: "Auto brzina", trails: "Tragovi", simTime: "Vrijeme simulacije", distanceToTarget: "Udaljenost do {target}", distanceToNextTarget: "Udaljenost do cilja", approachSpeed: "Brzina prilaza", flightTime: "Vrijeme misije", shipAction: "Što letjelica radi", nextBurn: "Sljedeće paljenje", enginePower: "Snaga motora", fuelLeft: "Preostalo gorivo", orbitTilt: "Nagib prema putanji Zemlje", noData: "nema", noMoreBurns: "Nema planiranih paljenja", ready: "Spremno za lansiranje", notLaunched: "nije lansirano", coasting: "Let bez potiska", firing: "Motor radi", nextBurnIn: "{name} za {time}", targetTilt: "cilj {deg}°", speedCompact: "Brzina", timeCompact: "Vrijeme", freeCamera: "Slobodna" },
    hu: { start: "Start", stop: "Stop", restart: "Restart", advanced: "Haladó", language: "Nyelv", scenario: "Forgatókönyv", timescale: "Időskála", camera: "Kamera", autoSpeed: "Auto sebesség", trails: "Nyomvonalak", simTime: "Szimulációs idő", distanceToTarget: "Távolság: {target}", distanceToNextTarget: "Távolság a célig", approachSpeed: "Közeledési sebesség", flightTime: "Küldetés ideje", shipAction: "Mit csinál az űrhajó", nextBurn: "Következő hajtóműégetés", enginePower: "Hajtómű teljesítmény", fuelLeft: "Maradék üzemanyag", orbitTilt: "Pályadőlés a Föld útjához képest", noData: "nincs", noMoreBurns: "Nincs több tervezett égetés", ready: "Indításra kész", notLaunched: "nincs indítva", coasting: "Tolóerő nélkül repül", firing: "A hajtómű működik", nextBurnIn: "{name} {time} múlva", targetTilt: "cél {deg}°", speedCompact: "Sebesség", timeCompact: "Idő", freeCamera: "Szabad" },
    ms: { start: "Mula", stop: "Henti", restart: "Mula semula", advanced: "Lanjutan", language: "Bahasa", scenario: "Senario", timescale: "Skala masa", camera: "Kamera", autoSpeed: "Kelajuan auto", trails: "Jejak", simTime: "Masa simulasi", distanceToTarget: "Jarak ke {target}", distanceToNextTarget: "Jarak ke sasaran", approachSpeed: "Kelajuan menghampiri", flightTime: "Masa misi", shipAction: "Apa kapal sedang buat", nextBurn: "Pembakaran enjin seterusnya", enginePower: "Kuasa enjin", fuelLeft: "Baki bahan api", orbitTilt: "Kecondongan orbit vs laluan Bumi", noData: "tiada", noMoreBurns: "Tiada pembakaran dirancang", ready: "Sedia dilancar", notLaunched: "belum dilancar", coasting: "Terbang tanpa tujahan", firing: "Enjin hidup", nextBurnIn: "{name} dalam {time}", targetTilt: "sasaran {deg}°", speedCompact: "Kelajuan", timeCompact: "Masa", freeCamera: "Bebas" },
    no: { start: "Start", stop: "Stopp", restart: "Start på nytt", advanced: "Avansert", language: "Språk", scenario: "Scenario", timescale: "Tidsskala", camera: "Kamera", autoSpeed: "Auto hastighet", trails: "Spor", simTime: "Simuleringstid", distanceToTarget: "Avstand til {target}", distanceToNextTarget: "Avstand til mål", approachSpeed: "Tilnærmingshastighet", flightTime: "Oppdragstid", shipAction: "Hva fartøyet gjør", nextBurn: "Neste motorbrenning", enginePower: "Motorkraft", fuelLeft: "Drivstoff igjen", orbitTilt: "Banehelling mot Jordens vei", noData: "ingen", noMoreBurns: "Ingen planlagte brenninger", ready: "Klar for oppskyting", notLaunched: "ikke skutt opp", coasting: "Flyr uten skyvekraft", firing: "Motoren går", nextBurnIn: "{name} om {time}", targetTilt: "mål {deg}°", speedCompact: "Hastighet", timeCompact: "Tid", freeCamera: "Fri" },
    ro: { start: "Start", stop: "Stop", restart: "Restart", advanced: "Avansat", language: "Limbă", scenario: "Scenariu", timescale: "Scară timp", camera: "Cameră", autoSpeed: "Viteză auto", trails: "Urme", simTime: "Timp simulare", distanceToTarget: "Distanță până la {target}", distanceToNextTarget: "Distanță până la țintă", approachSpeed: "Viteză de apropiere", flightTime: "Timp misiune", shipAction: "Ce face nava", nextBurn: "Următoarea aprindere", enginePower: "Putere motor", fuelLeft: "Combustibil rămas", orbitTilt: "Înclinare față de drumul Pământului", noData: "nu există", noMoreBurns: "Nu mai sunt aprinderi", ready: "Gata de lansare", notLaunched: "nelansat", coasting: "Zboară fără tracțiune", firing: "Motorul funcționează", nextBurnIn: "{name} în {time}", targetTilt: "țintă {deg}°", speedCompact: "Viteză", timeCompact: "Timp", freeCamera: "Liberă" },
    sk: { start: "Štart", stop: "Stop", restart: "Restart", advanced: "Rozšírené", language: "Jazyk", scenario: "Scenár", timescale: "Mierka času", camera: "Kamera", autoSpeed: "Auto rýchlosť", trails: "Stopy", simTime: "Čas simulácie", distanceToTarget: "Vzdialenosť k {target}", distanceToNextTarget: "Vzdialenosť k cieľu", approachSpeed: "Rýchlosť priblíženia", flightTime: "Čas misie", shipAction: "Čo robí loď", nextBurn: "Ďalší zážih", enginePower: "Výkon motora", fuelLeft: "Zvyšné palivo", orbitTilt: "Sklon k dráhe Zeme", noData: "nie je", noMoreBurns: "Žiadne ďalšie zážihy", ready: "Pripravené na štart", notLaunched: "neodštartované", coasting: "Let bez ťahu", firing: "Motor beží", nextBurnIn: "{name} o {time}", targetTilt: "cieľ {deg}°", speedCompact: "Rýchlosť", timeCompact: "Čas", freeCamera: "Voľná" },
    sl: { start: "Start", stop: "Stop", restart: "Restart", advanced: "Napredno", language: "Jezik", scenario: "Scenarij", timescale: "Časovna skala", camera: "Kamera", autoSpeed: "Auto hitrost", trails: "Sledi", simTime: "Čas simulacije", distanceToTarget: "Razdalja do {target}", distanceToNextTarget: "Razdalja do cilja", approachSpeed: "Hitrost približevanja", flightTime: "Čas misije", shipAction: "Kaj počne plovilo", nextBurn: "Naslednji vžig", enginePower: "Moč motorja", fuelLeft: "Preostalo gorivo", orbitTilt: "Nagib glede na pot Zemlje", noData: "ni", noMoreBurns: "Ni več načrtovanih vžigov", ready: "Pripravljeno za izstrelitev", notLaunched: "ni izstreljeno", coasting: "Leti brez potiska", firing: "Motor deluje", nextBurnIn: "{name} čez {time}", targetTilt: "cilj {deg}°", speedCompact: "Hitrost", timeCompact: "Čas", freeCamera: "Prosta" },
    sr: { start: "Старт", stop: "Стоп", advanced: "Напредно", language: "Језик", scenario: "Сценарио", timescale: "Скала времена", camera: "Камера", autoSpeed: "Ауто брзина", trails: "Трагови", simTime: "Време симулације", distanceToTarget: "Удаљеност до {target}", distanceToNextTarget: "Удаљеност до циља", approachSpeed: "Брзина приближавања", flightTime: "Време мисије", shipAction: "Шта брод ради", nextBurn: "Следеће паљење", enginePower: "Снага мотора", fuelLeft: "Преостало гориво", orbitTilt: "Нагиб према путањи Земље", noData: "нема", noMoreBurns: "Нема планираних паљења", ready: "Спремно за лансирање", notLaunched: "није лансирано", coasting: "Лети без потиска", firing: "Мотор ради", nextBurnIn: "{name} за {time}", targetTilt: "циљ {deg}°", speedCompact: "Брзина", timeCompact: "Време", freeCamera: "Слободна" },
    bn: { start: "শুরু", stop: "থামান", restart: "আবার শুরু", advanced: "উন্নত", language: "ভাষা", scenario: "দৃশ্য", timescale: "সময় স্কেল", camera: "ক্যামেরা", autoSpeed: "স্বয়ং গতি", trails: "পথচিহ্ন", simTime: "সিমুলেশন সময়", distanceToTarget: "{target} পর্যন্ত দূরত্ব", distanceToNextTarget: "লক্ষ্য পর্যন্ত দূরত্ব", approachSpeed: "কাছে আসার গতি", flightTime: "মিশন সময়", shipAction: "যান কী করছে", nextBurn: "পরের ইঞ্জিন বার্ন", enginePower: "ইঞ্জিন শক্তি", fuelLeft: "বাকি জ্বালানি", orbitTilt: "পৃথিবীর পথে কক্ষপথের ঢাল", noData: "নেই", noMoreBurns: "আর বার্ন নেই", ready: "উৎক্ষেপণের জন্য প্রস্তুত", notLaunched: "উৎক্ষেপণ হয়নি", coasting: "ইঞ্জিন ঠেলা ছাড়া উড়ছে", firing: "ইঞ্জিন চলছে", nextBurnIn: "{time} পরে {name}", targetTilt: "লক্ষ্য {deg} deg", speedCompact: "গতি", timeCompact: "সময়", freeCamera: "মুক্ত" },
    fa: { start: "شروع", stop: "توقف", restart: "شروع دوباره", advanced: "پیشرفته", language: "زبان", scenario: "سناریو", timescale: "مقیاس زمان", camera: "دوربین", autoSpeed: "سرعت خودکار", trails: "ردها", simTime: "زمان شبیه‌سازی", distanceToTarget: "فاصله تا {target}", distanceToNextTarget: "فاصله تا هدف", approachSpeed: "سرعت نزدیک‌شدن", flightTime: "زمان مأموریت", shipAction: "فضاپیما چه می‌کند", nextBurn: "روشن‌کردن بعدی موتور", enginePower: "قدرت موتور", fuelLeft: "سوخت باقی‌مانده", orbitTilt: "شیب مدار نسبت به مسیر زمین", noData: "ندارد", noMoreBurns: "روشن‌کردن برنامه‌ریزی‌شده‌ای نیست", ready: "آماده پرتاب", notLaunched: "پرتاب نشده", coasting: "پرواز بدون رانش", firing: "موتور روشن است", nextBurnIn: "{name} تا {time}", targetTilt: "هدف {deg}°", speedCompact: "سرعت", timeCompact: "زمان", freeCamera: "آزاد" },
    ur: { start: "شروع", stop: "روکیں", restart: "دوبارہ شروع", advanced: "اعلیٰ", language: "زبان", scenario: "منظر", timescale: "وقت کا پیمانہ", camera: "کیمرہ", autoSpeed: "خودکار رفتار", trails: "راستے", simTime: "سیمولیشن وقت", distanceToTarget: "{target} تک فاصلہ", distanceToNextTarget: "ہدف تک فاصلہ", approachSpeed: "قریب آنے کی رفتار", flightTime: "مشن وقت", shipAction: "جہاز کیا کر رہا ہے", nextBurn: "اگلا انجن برن", enginePower: "انجن طاقت", fuelLeft: "باقی ایندھن", orbitTilt: "زمین کے راستے سے مدار کا جھکاؤ", noData: "نہیں", noMoreBurns: "مزید برن نہیں", ready: "لانچ کے لیے تیار", notLaunched: "لانچ نہیں ہوا", coasting: "بغیر دھکے اڑ رہا ہے", firing: "انجن چل رہا ہے", nextBurnIn: "{time} میں {name}", targetTilt: "ہدف {deg} deg", speedCompact: "رفتار", timeCompact: "وقت", freeCamera: "آزاد" }
  });
  const LANGUAGE_NAMES = {
    en: "English",
    ru: "Русский",
    fil: "Filipino",
    id: "Indonesia",
    zh: "中文",
    ko: "한국어",
    ja: "日本語",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    pt: "Português",
    hi: "हिन्दी",
    tr: "Türkçe",
    vi: "Tiếng Việt",
    th: "ไทย",
    it: "Italiano",
    pl: "Polski",
    nl: "Nederlands",
    sv: "Svenska",
    kk: "Қазақша",
    bg: "Български",
    cs: "Čeština",
    da: "Dansk",
    el: "Ελληνικά",
    fi: "Suomi",
    hr: "Hrvatski",
    hu: "Magyar",
    ms: "Bahasa Melayu",
    no: "Norsk",
    ro: "Română",
    sk: "Slovenčina",
    sl: "Slovenščina",
    sr: "Српски",
    bn: "বাংলা",
    fa: "فارسی",
    ur: "اردو"
  };
  const BODY_LABELS = {
    ru: { Sun: "Солнце", Mercury: "Меркурий", Venus: "Венера", Earth: "Земля", Moon: "Луна", Mars: "Марс", Jupiter: "Юпитер", Saturn: "Сатурн", Uranus: "Уран", Neptune: "Нептун", Rocket: "Ракета" },
    fil: { Sun: "Araw", Earth: "Earth", Moon: "Buwan", Jupiter: "Jupiter", Saturn: "Saturn", Uranus: "Uranus", Neptune: "Neptune", Rocket: "Raketa" },
    id: { Sun: "Matahari", Earth: "Bumi", Moon: "Bulan", Jupiter: "Jupiter", Saturn: "Saturnus", Uranus: "Uranus", Neptune: "Neptunus", Rocket: "Roket" },
    zh: { Sun: "太阳", Mercury: "水星", Venus: "金星", Earth: "地球", Moon: "月球", Mars: "火星", Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Rocket: "火箭" },
    ko: { Sun: "태양", Earth: "지구", Moon: "달", Jupiter: "목성", Saturn: "토성", Uranus: "천왕성", Neptune: "해왕성", Rocket: "로켓" },
    ja: { Sun: "太陽", Earth: "地球", Moon: "月", Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Rocket: "ロケット" },
    es: { Sun: "Sol", Earth: "Tierra", Moon: "Luna", Jupiter: "Júpiter", Rocket: "Cohete" },
    fr: { Sun: "Soleil", Earth: "Terre", Moon: "Lune", Jupiter: "Jupiter", Rocket: "Fusée" },
    de: { Sun: "Sonne", Earth: "Erde", Moon: "Mond", Jupiter: "Jupiter", Rocket: "Rakete" },
    pt: { Sun: "Sol", Earth: "Terra", Moon: "Lua", Jupiter: "Júpiter", Rocket: "Foguete" },
    hi: { Sun: "सूर्य", Earth: "पृथ्वी", Moon: "चंद्रमा", Jupiter: "बृहस्पति", Rocket: "रॉकेट" },
    tr: { Sun: "Güneş", Earth: "Dünya", Moon: "Ay", Jupiter: "Jüpiter", Rocket: "Roket" },
    vi: { Sun: "Mặt Trời", Earth: "Trái Đất", Moon: "Mặt Trăng", Jupiter: "Sao Mộc", Rocket: "Tên lửa" },
    th: { Sun: "ดวงอาทิตย์", Earth: "โลก", Moon: "ดวงจันทร์", Jupiter: "ดาวพฤหัสบดี", Rocket: "จรวด" },
    it: { Sun: "Sole", Earth: "Terra", Moon: "Luna", Jupiter: "Giove", Rocket: "Razzo" },
    pl: { Sun: "Słońce", Earth: "Ziemia", Moon: "Księżyc", Jupiter: "Jowisz", Rocket: "Rakieta" },
    nl: { Sun: "Zon", Earth: "Aarde", Moon: "Maan", Jupiter: "Jupiter", Rocket: "Raket" },
    sv: { Sun: "Solen", Earth: "Jorden", Moon: "Månen", Jupiter: "Jupiter", Rocket: "Raket" },
    kk: { Sun: "Күн", Earth: "Жер", Moon: "Ай", Jupiter: "Юпитер", Rocket: "Зымыран" }
  };
  const SCENARIO_LABELS = {
    ru: {
      "voyager-2-grand-tour": "Вояджер-2 — большой тур (1977)",
      "jupiter-earth-return": "Гравитационный маневр у Юпитера → назад к Земле",
      "apollo-11": "Аполлон-11 — посадка на Луну (1969)",
      "vostok-1": "Восток-1 — Гагарин (1961)",
      "lunar-landing-mission": "Посадка на Луну",
      "artemis-2-free-return": "Артемида II — облет Луны (2026)",
      "lunar-orbit-mission": "Выход на орбиту Луны",
      "crew-dragon-iss-ksc": "Crew Dragon → МКС (KSC)",
      "soyuz-iss-baikonur": "Союз → МКС (Байконур)",
      "toy-earth-moon-rocket": "Учебная Земля-Луна + ракета",
      "toy-earth-rocket": "Учебная Земля + ракета",
      "real-2026-05-01-sun-earth-jupiter": "Реальные Солнце-Земля-Юпитер",
      "real-2026-05-01-full": "Реальная Солнечная система 2026-05-01",
      "jupiter-gravity-assist-handcrafted": "Настроенный маневр у Юпитера"
    },
    id: { "voyager-2-grand-tour": "Voyager 2 — tur planet luar", "apollo-11": "Apollo 11 — pendaratan Bulan", "vostok-1": "Vostok 1 — Gagarin", "lunar-landing-mission": "Pendaratan Bulan", "soyuz-iss-baikonur": "Soyuz → ISS", "crew-dragon-iss-ksc": "Crew Dragon → ISS" },
    fil: { "voyager-2-grand-tour": "Voyager 2 — grand tour", "apollo-11": "Apollo 11 — landing sa Buwan", "vostok-1": "Vostok 1 — Gagarin", "lunar-landing-mission": "Landing sa Buwan", "soyuz-iss-baikonur": "Soyuz → ISS", "crew-dragon-iss-ksc": "Crew Dragon → ISS" },
    zh: { "voyager-2-grand-tour": "旅行者2号 — 行星大巡游", "apollo-11": "阿波罗11号 — 登月", "vostok-1": "东方1号 — 加加林", "lunar-landing-mission": "月球着陆", "lunar-orbit-mission": "进入月球轨道", "soyuz-iss-baikonur": "联盟号 → 国际空间站", "crew-dragon-iss-ksc": "龙飞船 → 国际空间站" },
    ko: { "voyager-2-grand-tour": "보이저 2호 — 그랜드 투어", "apollo-11": "아폴로 11호 — 달 착륙", "vostok-1": "보스토크 1호 — 가가린", "lunar-landing-mission": "달 착륙", "soyuz-iss-baikonur": "소유스 → ISS", "crew-dragon-iss-ksc": "크루 드래곤 → ISS" },
    ja: { "voyager-2-grand-tour": "ボイジャー2号 — グランドツアー", "apollo-11": "アポロ11号 — 月面着陸", "vostok-1": "ボストーク1号 — ガガーリン", "lunar-landing-mission": "月面着陸", "soyuz-iss-baikonur": "ソユーズ → ISS", "crew-dragon-iss-ksc": "クルードラゴン → ISS" }
  };
  let currentLanguage = chooseInitialLanguage();

  const DEFAULT_METERS_TO_UNITS = 1 / 8.0e9;
  const DEFAULT_RADIUS_TO_UNITS = 1 / 8.0e9;
  const BASE_STEP_SECONDS = 3600;
  const MAX_FRAME_SUBSTEPS = 500;
  const TIME_SCALE_MIN = 0.1;
  const TIME_SCALE_MAX = 10000;
  const DYNAMIC_TIME_SCALE = {
    engineOn: 1,
    burnUnder30Seconds: 2,
    burnUnder120Seconds: 8,
    lowOrbit: 12,
    nearEarth: 20,
    nearMoon: 18,
    nearJupiter: 24,
    longCoast: 220
  };
  const TRAIL_SAMPLE_SECONDS = {
    Sun: constants.DAY * 7,
    Mercury: constants.DAY * 2,
    Venus: constants.DAY * 2,
    Earth: constants.DAY * 2,
    Moon: constants.DAY / 8,
    ISS: 60,
    Mars: constants.DAY * 3,
    Jupiter: constants.DAY * 10,
    Saturn: constants.DAY * 14,
    Uranus: constants.DAY * 20,
    Neptune: constants.DAY * 24,
    Rocket: constants.DAY / 4
  };

  let activeScenarioId = SolarScenarioData.defaultScenarioId;
  let activeScenario = getScenario(activeScenarioId);
  let bodies = createInitialBodies(activeScenarioId, {
    satelliteLib: typeof satellite === "undefined" ? null : satellite
  });
  let elapsedSeconds = 0;
  let running = false;
  let lastFrameTime = 0;
  let rocketMissionState = null;
  let rocketLaunched = false;
  let missionFailed = false;
  let preLaunchPhase = false;
  let launchWindowAtSeconds = null;
  const PRE_LAUNCH_TIME_SCALE = 100;
  let manualTimeScale = clampTimeScale(sliderToTimeScale(Number(timeScaleInput.value)));
  let effectiveTimeScale = manualTimeScale;
  const cameraFollowOffset = new THREE.Vector3();
  let lastCameraTargetName = "";
  let flybyTargetIndex = 0;
  let flybyTargetMinDist = Infinity;

  // --- ISS SGP4 tracking ---
  // TLE for 2026-05-01 (NORAD 25544)
  const ISS_TLE_LINE1 = '1 25544U 98067A   26120.50000000  .00016717  00000-0  10270-3 0  9001';
  const ISS_TLE_LINE2 = '2 25544  51.6461 339.7939 0002234  43.0609 317.0704 15.48919811999999';

  let _issSatrec = null;
  let _issEpochMs = null;
  let _issGmst0 = null;

  function initISS() {
    if (typeof satellite === 'undefined') {
      console.warn('[ISS] satellite.js not loaded, SGP4 unavailable');
      return;
    }
    _issSatrec = satellite.twoline2satrec(ISS_TLE_LINE1, ISS_TLE_LINE2);
    _issEpochMs = Date.now();
    _issGmst0 = satellite.gstime(new Date(_issEpochMs));
    console.log('[ISS] SGP4 initialised from hardcoded TLE');
  }

  function hasScriptedISSState(scenario) {
    if (!scenario || !scenario.initialState) return false;
    const initialState = scenario.initialState;
    if (initialState.type === "absolute") {
      return !!(initialState.bodies && initialState.bodies.some((body) => body.name === "ISS"));
    }
    if (initialState.type === "ephemeris") {
      return !!(initialState.includeBodies && initialState.includeBodies.includes("ISS"));
    }
    return false;
  }

  function updateISSPosition(bodies, simulatedElapsedSeconds) {
    if (hasScriptedISSState(activeScenario)) return;

    const issBody = bodies.find((b) => b.name === 'ISS');
    const earth = bodies.find((b) => b.name === 'Earth');
    if (!issBody || !earth || !_issSatrec) return;

    // Real-world time offset by simulated elapsed time
    const nowMs = (_issEpochMs || Date.now()) + simulatedElapsedSeconds * 1000;
    const nowDate = new Date(nowMs);

    const posVel = satellite.propagate(_issSatrec, nowDate);
    if (!posVel || !posVel.position) return;

    // satellite.js returns km in ECI (J2000 Earth-centred inertial).
    // Physics frame is a frozen-ECEF frame: x = geographic lon 0° at simulation epoch.
    // Rotate ECI -> frozen-ECEF by -GMST0 around z-axis, then convert km -> m.
    const cg = Math.cos(-_issGmst0), sg = Math.sin(-_issGmst0);
    const px = posVel.position.x * 1000, py = posVel.position.y * 1000;
    const vx = posVel.velocity.x * 1000, vy = posVel.velocity.y * 1000;
    issBody.position.x = earth.position.x + px * cg - py * sg;
    issBody.position.y = earth.position.y + px * sg + py * cg;
    issBody.position.z = earth.position.z + posVel.position.z * 1000;
    issBody.velocity.x = earth.velocity.x + vx * cg - vy * sg;
    issBody.velocity.y = earth.velocity.y + vx * sg + vy * cg;
    issBody.velocity.z = earth.velocity.z + posVel.velocity.z * 1000;
  }

  // Initialise ISS once satellite.js is available (it's loaded synchronously before this script)
  initISS();

  // Returns seconds until the next launch window (when launchSite enters the ISS orbital plane).
  // Uses the SGP4-derived orbital normal and GMST to solve analytically.
  // Returns 0 if satellite.js is unavailable.
  function computeLaunchWindowFromState(position, velocity, site, lonOffsetRad = 0) {
    return computeLaunchWindowFromOrbitalState(
      position,
      velocity,
      site,
      currentMission() || {},
      { lonOffsetRad }
    );
  }

  function computeLaunchWindowSeconds(site) {
    if (hasScriptedISSState(activeScenario)) {
      return computeLaunchWindowForBodies(bodies, site, currentMission() || {}, "ISS");
    }

    if (typeof satellite === 'undefined' || !_issSatrec || !_issEpochMs) return 0;
    const date0 = new Date(_issEpochMs);
    const posVel = satellite.propagate(_issSatrec, date0);
    if (!posVel || !posVel.position || !posVel.velocity) return 0;

    const gmst0 = satellite.gstime(date0);
    return computeLaunchWindowFromState(posVel.position, posVel.velocity, site, gmst0);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#03050a");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.001, 2000);
  camera.position.set(0, 85, 155);
  camera.lookAt(0, 0, 0);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 1200;

  const ambient = new THREE.AmbientLight("#ffffff", 0.18);
  scene.add(ambient);

  const sunLight = new THREE.PointLight("#fff1c4", 1.5, 0, 0);
  scene.add(sunLight);


  let proceduralStars = createStars();
  let skySphere = null;
  scene.add(proceduralStars);

  const bodyMeshes = new Map();
  const trails = new Map();
  const markerGroup = new THREE.Group();
  const referenceOrbitGroup = new THREE.Group();
  scene.add(markerGroup);
  scene.add(referenceOrbitGroup);

  const textures = {};
  let saturnRingTexture = null;
  const textureLoader = new THREE.TextureLoader();

  // Mirror horizontally for all spheres: physics Y → scene Z inverts east/west handedness.
  function mirrorTex(tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(-1, 1);
    tex.offset.set(1, 0);
    tex.needsUpdate = true;
  }

  const BODY_TEXTURES = Object.fromEntries(
    Object.entries(SolarScenarioData.bodyCatalog)
      .filter(([, body]) => body.texturePath)
      .map(([name, body]) => [name, body.texturePath])
  );
  const saturnCatalog = SolarScenarioData.bodyCatalog.Saturn || {};
  const saturnRingTexturePath = saturnCatalog.rings && saturnCatalog.rings.texturePath;

  for (const [name, path] of Object.entries(BODY_TEXTURES)) {
    textureLoader.load(path, (tex) => {
      mirrorTex(tex);
      textures[name] = tex;
      const mesh = bodyMeshes.get(name);
      if (mesh) applyBodyTexture(mesh, name, tex);
    }, undefined, () => console.warn(`Texture ${name} skipped`));
  }

  if (saturnRingTexturePath) {
    textureLoader.load(saturnRingTexturePath, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      saturnRingTexture = tex;
      const mesh = bodyMeshes.get("Saturn");
      if (mesh) applySaturnRingTexture(mesh, tex);
    }, undefined, () => console.warn('Saturn ring texture skipped'));
  }

  // Star background: replace procedural points with milky-way texture sphere.
  textureLoader.load('sim-assets/textures/solar-system-scope/stars_milky_way.jpg', (tex) => {
    scene.remove(proceduralStars);
    proceduralStars = null;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 32, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false })
    );
    sky.frustumCulled = false;
    sky.renderOrder = -1000;
    skySphere = sky;
    scene.add(sky);
  });

  let ldemTexture = null;
  MeshFactory.init({
    textures,
    getLdemTexture: () => ldemTexture,
    getSaturnRingTexture: () => saturnRingTexture,
    getElapsed: () => elapsedSeconds,
    getShowTrails: () => showTrailsInput.checked,
  });
  const { createBodyMesh, createTrail, resetTrail, applyBodyTexture, applySaturnRingTexture } = MeshFactory;
  const _siteVec = new THREE.Vector3();
  let ldemCanvas = null;
  let ldemImageData = null;
  textureLoader.load('sim-assets/textures/nasa/moon_ldem_3_8bit.jpg', (tex) => {
    ldemTexture = tex;
    // Pre-bake into canvas for pixel lookup (used by collision detection)
    const img = tex.image;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ldemCanvas = c;
    ldemImageData = ctx.getImageData(0, 0, c.width, c.height);
    setLdemImageData(ldemImageData);
  }, undefined, () => console.warn('LDEM texture skipped'));

  const launchSiteMarkers = [];
  if (rocketSim) {
    for (const site of rocketSim.launchSites()) {
      site.latRad = site.latDeg * Math.PI / 180;
      site.lonRad = site.lonDeg * Math.PI / 180;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#ff6600' })
      );
      dot.visible = false;
      scene.add(dot);
      launchSiteMarkers.push({ site, dot });
    }
  }

  populateScenarioSelect();
  applyLanguage();
  applyScenarioUiDefaults();
  applyScenarioCamera();
  syncSceneObjects();
  syncReferenceOrbits();

  scenarioSelect.addEventListener("change", () => {
    scenarioChangedWhileOpen = true;
    selectScenario(scenarioSelect.value, false);
  });

  scenarioSelect.addEventListener("pointerdown", () => {
    scenarioSelectValueBeforeOpen = scenarioSelect.value;
    scenarioChangedWhileOpen = false;
  });

  scenarioSelect.addEventListener("blur", () => {
    if (!running && rocketLaunched && !scenarioChangedWhileOpen && scenarioSelect.value === scenarioSelectValueBeforeOpen) {
      resetSimulation();
    }
  });

  function doLaunch() {
    if (rocketLaunched) return;
    rocketLaunched = true;
    const mission = currentMission();
    if (mission && mission.preLaunchWindow) {
      const site = mission.launchSite;
      const windowSeconds = computeLaunchWindowSeconds(site);
      if (windowSeconds > 60) {
        preLaunchPhase = true;
        launchWindowAtSeconds = windowSeconds;
        showLaunchWindowOverlay(windowSeconds);
        syncSceneObjects();
        return;
      }
    }
    activateLaunch(mission, 0);
  }

  function activateLaunch(mission, earthRotationOffsetSeconds) {
    if (mission) {
      if (!rocketMissionState) {
        rocketMissionState = rocketSim.createMissionState(mission, bodies, earthRotationOffsetSeconds);
        if (mission.launchTimeScale != null) {
          timeScaleInput.value = timeScaleToSlider(mission.launchTimeScale);
          timeScaleNum.value = fmtTimeScale(mission.launchTimeScale);
        }
      }
    } else if (activeScenario.rocket) {
      bodies = launchRocket(bodies, activeScenarioId);
    }
    syncSceneObjects();
    if (mission && activeScenario.ui && activeScenario.ui.focusRocketOnLaunch) {
      focusCameraOnRocketLaunch();
    }
  }

  runButton.addEventListener("click", () => {
    if (missionFailed) {
      resetSimulation();
      return;
    }
    running = !running;
    updateRunButtonText();
    if (running) {
      syncScenarioSelectState();
      doLaunch();
      collapsePanelAfterRun();
    } else {
      syncScenarioSelectState();
    }
  });

  panelToggleButton && panelToggleButton.addEventListener("click", () => {
    const hidden = panel.classList.toggle("panel-hidden");
    panelToggleButton.textContent = hidden ? "›" : "‹";
    panelToggleButton.setAttribute("aria-label", hidden ? "Show controls" : "Hide controls");
    panelToggleButton.title = hidden ? "Show controls" : "Hide controls";
    resizeRenderer();
  });

  languageSelect && languageSelect.addEventListener("change", () => {
    currentLanguage = languageSelect.value;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    applyLanguage();
    updateReadouts();
  });

  showTrailsInput.addEventListener("change", () => {
    for (const trail of trails.values()) {
      trail.line.visible = showTrailsInput.checked;
    }
  });

  timeScaleInput.addEventListener("input", () => {
    applyManualTimeScale(sliderToTimeScale(timeScaleInput.value));
  });

  timeScaleNum.addEventListener("blur", () => {
    const raw = Number(timeScaleNum.value);
    if (!Number.isFinite(raw) || timeScaleNum.value.trim() === "") {
      syncDisplayedTimeScale(effectiveTimeScale);
      return;
    }
    applyManualTimeScale(raw);
  });

  timeScaleNum.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      timeScaleNum.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      setTimeout(() => {
        const v = Number(timeScaleNum.value);
        if (Number.isFinite(v)) {
          applyManualTimeScale(v);
        }
      }, 0);
    }
  });

  dynamicTimeScaleInput && dynamicTimeScaleInput.addEventListener("change", () => {
    if (!dynamicTimeScaleInput.checked) {
      effectiveTimeScale = manualTimeScale;
      syncDisplayedTimeScale(effectiveTimeScale);
    }
  });

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();

  // Landing result overlay
  const landingOverlay = document.createElement('div');
  landingOverlay.id = 'landing-overlay';
  landingOverlay.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:24px 40px;border-radius:12px;font-size:24px;font-weight:bold;z-index:1000;text-align:center;border:2px solid #0f0;';
  document.body.appendChild(landingOverlay);

  // Launch window countdown overlay
  const launchWindowOverlay = document.createElement('div');
  launchWindowOverlay.id = 'launch-window-overlay';
  launchWindowOverlay.style.cssText = [
    'display:none',
    'position:fixed',
    'top:50%',
    'left:50%',
    'transform:translate(-50%,-50%)',
    'background:rgba(0,8,20,0.88)',
    'color:#7cf',
    'padding:20px 36px',
    'border-radius:12px',
    'font-family:monospace',
    'font-size:14px',
    'z-index:999',
    'text-align:center',
    'border:1px solid #1af',
    'pointer-events:none'
  ].join(';');
  launchWindowOverlay.innerHTML = `
    <div style="font-size:11px;opacity:0.7;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">
      Ожидание окна запуска
    </div>
    <div id="lw-countdown" style="font-size:28px;font-weight:bold;letter-spacing:2px;color:#fff">—</div>
    <div style="font-size:11px;opacity:0.6;margin-top:6px">Байконур входит в плоскость орбиты МКС</div>
  `;
  document.body.appendChild(launchWindowOverlay);

  function showLaunchWindowOverlay(totalSeconds) {
    launchWindowOverlay.style.display = 'block';
    updateLaunchWindowCountdown(totalSeconds);
  }

  function hideLaunchWindowOverlay() {
    launchWindowOverlay.style.display = 'none';
  }

  function updateLaunchWindowCountdown(remainingSeconds) {
    const el = document.getElementById('lw-countdown');
    if (el) el.textContent = formatCountdown(remainingSeconds);
  }

  function showLandingResult(success, speedMs, bodyName) {
    const body = bodyName || 'surface';
    if (success) {
      landingOverlay.style.borderColor = '#0f0';
      landingOverlay.style.color = '#0f0';
      landingOverlay.innerHTML = `✓ Soft landing on ${body}<br><span style="font-size:16px;color:#aaa">${speedMs.toFixed(1)} m/s impact speed</span>`;
    } else {
      landingOverlay.style.borderColor = '#f00';
      landingOverlay.style.color = '#f00';
      landingOverlay.innerHTML = `✗ Mission failed — ${body} impact<br><span style="font-size:16px;color:#aaa">${speedMs.toFixed(1)} m/s impact speed</span>`;
      missionFailed = true;
      running = false;
      updateRunButtonText();
      syncScenarioSelectState();
    }
    landingOverlay.style.display = 'block';
    setTimeout(() => { landingOverlay.style.display = 'none'; }, 6000);
  };

  requestAnimationFrame(animate);

  function animate(frameTime) {
    requestAnimationFrame(animate);
    const deltaMs = Math.min(frameTime - lastFrameTime, 80);
    lastFrameTime = frameTime;

    if (running) {
      const playbackScale = getPlaybackTimeScale();
      syncDisplayedTimeScale(playbackScale);
      stepPhysicsFrame(playbackScale);
    }

    updateMeshes();
    updateCameraTarget(deltaMs / 1000);
    controls.update();
    updateSkyPosition();
    updateReadouts();
    if (preLaunchPhase && launchWindowAtSeconds !== null) {
      updateLaunchWindowCountdown(launchWindowAtSeconds - elapsedSeconds);
    }
    renderer.render(scene, camera);
  }

  function stepPhysicsFrame(playbackScale) {
    let remainingSeconds = Math.max(playbackScale, 0.001) * (activeScenario.stepSeconds || BASE_STEP_SECONDS);
    let guard = 0;

    while (remainingSeconds > 0 && guard < MAX_FRAME_SUBSTEPS) {
      const scenarioStepSeconds = activeScenario.stepSeconds || BASE_STEP_SECONDS;
      const requestedStepSeconds = Math.min(remainingSeconds, scenarioStepSeconds);
      let stepSeconds = requestedStepSeconds;
      if (rocketSim && rocketMissionState) {
        stepSeconds = rocketSim.chooseStepSeconds(rocketMissionState, bodies, requestedStepSeconds);
      }

      stepSeconds = Math.min(stepSeconds, remainingSeconds);
      rocketSim && rocketSim.updateRocketBeforePhysics(rocketMissionState, bodies, stepSeconds);
      stepSimulation(bodies, stepSeconds);
      elapsedSeconds += stepSeconds;
      updateISSPosition(bodies, elapsedSeconds);
      checkLaunchWindow();

      const rocketBody = bodies.find((b) => b.name === 'Rocket');
      if (rocketBody && !(rocketMissionState && rocketMissionState.attachedToPad)) {
        checkLandings(bodies, rocketBody, showLandingResult);
        if (rocketBody._landed) {
          running = false;
          updateRunButtonText();
          syncScenarioSelectState();
          break;
        }
      }
      rocketSim && rocketSim.updateRocketAfterPhysics(rocketMissionState, bodies, stepSeconds);
      appendTrailSamples();
      remainingSeconds -= stepSeconds;
      guard += 1;
    }
  }

  function checkLaunchWindow() {
    if (preLaunchPhase && launchWindowAtSeconds !== null && elapsedSeconds >= launchWindowAtSeconds) {
      preLaunchPhase = false;
      hideLaunchWindowOverlay();
      activateLaunch(currentMission(), launchWindowAtSeconds);
    }
  }

  function getPlaybackTimeScale() {
    if (preLaunchPhase) {
      effectiveTimeScale = Math.max(PRE_LAUNCH_TIME_SCALE, manualTimeScale);
      return effectiveTimeScale;
    }
    effectiveTimeScale = dynamicTimeScaleInput && dynamicTimeScaleInput.checked
      ? chooseDynamicPlaybackScale()
      : manualTimeScale;
    return effectiveTimeScale;
  }

  function chooseDynamicPlaybackScale() {
    const missionStatus = rocketSim && rocketSim.missionStatus(rocketMissionState, bodies);
    if (!missionStatus) {
      return manualTimeScale;
    }

    if (missionStatus.engineOn) {
      return DYNAMIC_TIME_SCALE.engineOn;
    }

    if (missionStatus.nextBurnInSeconds <= 30) {
      return DYNAMIC_TIME_SCALE.burnUnder30Seconds;
    }

    if (missionStatus.nextBurnInSeconds <= 120) {
      return DYNAMIC_TIME_SCALE.burnUnder120Seconds;
    }

    const rocket = bodies.find((body) => body.name === "Rocket");
    if (!rocket) {
      return manualTimeScale;
    }

    const earth = bodies.find((body) => body.name === "Earth");
    if (earth) {
      const earthAltitude = distance(rocket.position, earth.position) - earth.radius;
      if (earthAltitude < 600000) {
        return DYNAMIC_TIME_SCALE.lowOrbit;
      }
      if (earthAltitude < earth.radius * 20) {
        return DYNAMIC_TIME_SCALE.nearEarth;
      }
    }

    const moon = bodies.find((body) => body.name === "Moon");
    if (isNearFlybyBody(rocket, moon, 18)) {
      return DYNAMIC_TIME_SCALE.nearMoon;
    }

    const jupiter = bodies.find((body) => body.name === "Jupiter");
    if (isNearFlybyBody(rocket, jupiter, 80)) {
      return DYNAMIC_TIME_SCALE.nearJupiter;
    }

    return Math.min(TIME_SCALE_MAX, Math.max(manualTimeScale, DYNAMIC_TIME_SCALE.longCoast));
  }

  function isNearFlybyBody(rocket, body, radiusMultiplier) {
    if (!rocket || !body) {
      return false;
    }
    return distance(rocket.position, body.position) < body.radius * radiusMultiplier;
  }

  function applyManualTimeScale(value) {
    manualTimeScale = clampTimeScale(value);
    effectiveTimeScale = manualTimeScale;
    if (dynamicTimeScaleInput) {
      dynamicTimeScaleInput.checked = false;
    }
    syncDisplayedTimeScale(effectiveTimeScale);
  }

  function syncDisplayedTimeScale(value) {
    const scale = clampTimeScale(value);
    timeScaleInput.value = timeScaleToSlider(scale);
    timeScaleNum.value = fmtTimeScale(scale);
  }

  function isMobileLayout() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function syncScenarioSelectState() {
    if (scenarioSelect) {
      scenarioSelect.disabled = running && !missionFailed;
    }
  }

  function updateRunButtonText() {
    runButton.textContent = missionFailed ? t("restart") : (running ? t("stop") : t("start"));
  }

  function collapsePanelAfterRun() {
    if (isMobileLayout()) {
      if (advancedControls) {
        advancedControls.open = false;
      }
      syncScenarioSelectState();
      resizeRenderer();
    }
  }

  function syncSceneObjects() {
    const currentNames = new Set(bodies.map((body) => body.name));

    for (const [name, mesh] of bodyMeshes) {
      if (!currentNames.has(name)) {
        scene.remove(mesh);
        bodyMeshes.delete(name);
      }
    }

    for (const [name, trail] of trails) {
      if (!currentNames.has(name)) {
        scene.remove(trail.line);
        trails.delete(name);
      }
    }

    for (const body of bodies) {
      if (!bodyMeshes.has(body.name)) {
        const mesh = createBodyMesh(body);
        bodyMeshes.set(body.name, mesh);
        scene.add(mesh);
      }

      if (!trails.has(body.name)) {
        const trail = createTrail(body);
        trails.set(body.name, trail);
        scene.add(trail.line);
      } else {
        resetTrail(trails.get(body.name));
      }
    }

    updateMeshes();
    syncCameraOptions();
  }

  function currentMission() {
    return rocketSim && rocketSim.missionForScenarioId(activeScenarioId);
  }

  function populateScenarioSelect() {
    syncScenarioOptions();
  }

  function syncScenarioOptions() {
    const previousValue = scenarioSelect.value || activeScenarioId;
    scenarioSelect.replaceChildren();
    for (const scenario of getScenarios()) {
      const option = document.createElement("option");
      option.value = scenario.id;
      option.textContent = scenarioLabel(scenario);
      scenarioSelect.append(option);
    }
    scenarioSelect.value = previousValue || activeScenarioId;
  }

  function selectScenario(scenarioId, startAfterReset = false) {
    activeScenarioId = scenarioId;
    activeScenario = getScenario(activeScenarioId);
    resetSimulation();
    applyScenarioUiDefaults();
    applyScenarioCamera();
    if (startAfterReset) {
      running = true;
      updateRunButtonText();
      doLaunch();
      collapsePanelAfterRun();
    }
  }

  function resetSimulation() {
    landingOverlay.style.display = 'none';
    hideLaunchWindowOverlay();
    preLaunchPhase = false;
    launchWindowAtSeconds = null;
    bodies = createInitialBodies(activeScenarioId, {
      satelliteLib: typeof satellite === "undefined" ? null : satellite
    });
    elapsedSeconds = 0;
    running = false;
    rocketMissionState = null;
    rocketLaunched = false;
    missionFailed = false;
    flybyTargetIndex = 0;
    flybyTargetMinDist = Infinity;
    updateRunButtonText();
    syncSceneObjects();
    syncReferenceOrbits();
    if (isMobileLayout()) {
      resizeRenderer();
    }
    syncScenarioSelectState();
    syncDisplayedTimeScale(getPlaybackTimeScale());
  }

  function applyScenarioCamera() {
    const config = activeScenario.camera || {};
    const position = config.position || [0, 85, 155];
    const target = config.target || [0, 0, 0];
    camera.position.set(position[0], position[1], position[2]);
    controls.target.set(target[0], target[1], target[2]);
    controls.maxDistance = config.maxDistance || 1200;
    controls.update();
  }

  function focusCameraOnRocketLaunch() {
    const rocket = bodies.find((body) => body.name === "Rocket");
    const earth = bodies.find((body) => body.name === "Earth");
    if (!rocket || !earth) {
      return;
    }

    const rocketPosition = toScenePosition(rocket.position);
    const earthPosition = toScenePosition(earth.position);
    const up = rocketPosition.clone().sub(earthPosition);
    if (up.lengthSq() === 0) {
      up.set(0, 1, 0);
    }
    up.normalize();

    const side = new THREE.Vector3(0, 1, 0).cross(up);
    if (side.lengthSq() < 0.0001) {
      side.set(1, 0, 0);
    }
    side.normalize();

    const earthRadius = getBodyVisualRadius(earth);
    const distance = Math.max(earthRadius * 1.8, 8);
    camera.position.copy(rocketPosition)
      .add(up.multiplyScalar(distance * 0.55))
      .add(side.multiplyScalar(distance));
    controls.target.copy(rocketPosition);
    controls.update();
  }

  function applyScenarioUiDefaults() {
    const defaults = activeScenario.ui || {};
    if (defaults.timeScale != null) {
      manualTimeScale = clampTimeScale(defaults.timeScale);
      if (!dynamicTimeScaleInput || !dynamicTimeScaleInput.checked) {
        effectiveTimeScale = manualTimeScale;
      }
      syncDisplayedTimeScale(getPlaybackTimeScale());
    }
    if (defaults.cameraTarget && hasSelectOption(cameraTargetSelect, defaults.cameraTarget)) {
      cameraTargetSelect.value = defaults.cameraTarget;
    }
  }

  function syncCameraOptions() {
    const previousValue = cameraTargetSelect.value;
    const values = new Set(["free"]);
    const bodyNames = bodies.map((body) => body.name.toLowerCase());

    cameraTargetSelect.replaceChildren();
    addCameraOption("free", t("freeCamera"));
    for (const name of bodyNames) {
      if (values.has(name)) {
        continue;
      }
      values.add(name);
      addCameraOption(name, bodyLabel(name));
    }

    if (values.has(previousValue)) {
      cameraTargetSelect.value = previousValue;
    } else if (values.has((activeScenario.ui || {}).cameraTarget)) {
      cameraTargetSelect.value = activeScenario.ui.cameraTarget;
    } else {
      cameraTargetSelect.value = "free";
    }
  }

  function addCameraOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    cameraTargetSelect.append(option);
  }

  function scenarioLabel(scenario) {
    return (SCENARIO_LABELS[currentLanguage] && SCENARIO_LABELS[currentLanguage][scenario.id])
      || scenario.label;
  }

  function bodyLabel(name) {
    const canonicalName = capitalize(name);
    return (BODY_LABELS[currentLanguage] && BODY_LABELS[currentLanguage][canonicalName])
      || canonicalName;
  }

  function updateMeshes() {
    markerGroup.clear();

    for (const body of bodies) {
      const mesh = bodyMeshes.get(body.name);
      const scenePosition = toScenePosition(body.position);
      mesh.position.copy(scenePosition);

      if (body.name === "Rocket") {
        const direction = body.attitudeDirection || body.velocity;
        const sceneDirection = new THREE.Vector3(direction.x, direction.z, direction.y);
        if (sceneDirection.lengthSq() > 0) {
          sceneDirection.normalize();
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sceneDirection);
        }
        const earthBody = bodies.find(b => b.name === "Earth");
        const earthR = earthBody ? getBodyVisualRadius(earthBody) : 1;
        mesh.scale.setScalar(Math.max(0.05, earthR * 0.1));
      } else {
        const radius = getBodyVisualRadius(body);
        if (body.name === "Earth") {
          applyEarthEllipsoidScale(mesh, body, radius);
        } else {
          mesh.scale.setScalar(radius);
        }
        if (mesh.userData && mesh.userData.spinNode) {
          mesh.userData.spinNode.rotation.y = getBodySpinAngle(body);
        } else {
          mesh.rotation.y = getBodySpinAngle(body);
        }
        if (body.name === "Saturn") {
          updateSaturnShadows(mesh, body);
        }
      }

      if (getViewConfig().markers && shouldShowMarker(body)) {
        addLabelMarker(body, scenePosition);
      }

      if (body.name === "Sun") {
        sunLight.position.copy(scenePosition);
      }
    }

    updateLaunchSiteMarkers();
  }

  function getBodySpinAngle(body) {
    const periodHours = body.rotationPeriodHours;
    if (!periodHours) {
      return 0;
    }
    return -elapsedSeconds / (Math.abs(periodHours) * 3600) * Math.PI * 2 * Math.sign(periodHours);
  }

  function updateSaturnShadows(mesh, saturn) {
    const shadow = mesh.userData && mesh.userData.saturnPlanetShadow;
    if (!shadow) return;

    const sun = bodies.find((body) => body.name === "Sun");
    if (!sun) {
      shadow.visible = false;
      return;
    }

    shadow.visible = true;
    const sunDirection = toScenePosition(sun.position).sub(toScenePosition(saturn.position)).normalize();
    const axialInverse = mesh.userData.axialGroup.quaternion.clone().invert();
    const localSun = sunDirection.applyQuaternion(axialInverse);
    shadow.rotation.y = Math.atan2(localSun.z, -localSun.x);
  }

  function appendTrailSamples() {
    if (!showTrailsInput.checked) {
      return;
    }

    const rocketInterval = rocketMissionState
      ? Math.max(10, activeScenario.stepSeconds || BASE_STEP_SECONDS)
      : TRAIL_SAMPLE_SECONDS.Rocket;

    for (const body of bodies) {
      const trail = trails.get(body.name);
      if (!trail) {
        continue;
      }

      const interval = body.name === "Rocket"
        ? rocketInterval
        : (TRAIL_SAMPLE_SECONDS[body.name] || constants.DAY * 3);
      if (elapsedSeconds < trail.nextSampleTime) {
        continue;
      }

      appendTrailPoint(trail, toScenePosition(body.position));
      trail.nextSampleTime = elapsedSeconds + interval;
    }
  }

  function appendTrailPoint(trail, scenePosition) {
    if (trail.count >= trail.capacity) {
      const newCapacity = trail.capacity * 2;
      const newPositions = new Float32Array(newCapacity * 3);
      newPositions.set(trail.positions.subarray(0, trail.count * 3));
      trail.positions = newPositions;
      trail.capacity = newCapacity;
      trail.line.geometry.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
    }

    const i = trail.count;
    trail.positions[i * 3] = scenePosition.x;
    trail.positions[i * 3 + 1] = scenePosition.y;
    trail.positions[i * 3 + 2] = scenePosition.z;
    trail.count++;

    trail.line.geometry.setDrawRange(0, trail.count);
    trail.line.geometry.attributes.position.needsUpdate = true;
  }

  function addLabelMarker(body, position) {
    const size = body.name === "Rocket" ? 0.25 : 0.18;
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(size, size * 1.35, 24),
      new THREE.MeshBasicMaterial({ color: body.color, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    marker.position.copy(position);
    marker.lookAt(camera.position);
    markerGroup.add(marker);
  }

  function updateCameraTarget(deltaSeconds) {
    const targetName = cameraTargetSelect.value;
    if (targetName === "free") {
      lastCameraTargetName = targetName;
      return;
    }

    const body = bodies.find((item) => item.name.toLowerCase() === targetName);
    if (!body) {
      return;
    }

    const target = toScenePosition(body.position);
    const switched = targetName !== lastCameraTargetName;
    lastCameraTargetName = targetName;

    if (switched) {
      // Camera stays at current world position; orbit pivot snaps to new body.
      // cameraFollowOffset is set so subsequent frames track the body with the same offset.
      controls.target.copy(target);
      cameraFollowOffset.copy(camera.position).sub(target);
      return;
    }

    // Keep camera-to-target offset constant: camera follows body immediately.
    cameraFollowOffset.copy(camera.position).sub(controls.target);
    controls.target.copy(target);
    camera.position.copy(controls.target).add(cameraFollowOffset);
  }

  function updateSkyPosition() {
    if (proceduralStars) {
      proceduralStars.position.copy(camera.position);
    }
    if (skySphere) {
      skySphere.position.copy(camera.position);
    }
  }

  function speedRefBody(rocket) {
    const moon = bodies.find((b) => b.name === "Moon");
    if (moon && distance(rocket.position, moon.position) < moon.radius * 40) return moon;
    const earth = bodies.find((b) => b.name === "Earth");
    if (earth && distance(rocket.position, earth.position) < earth.radius * 150) return earth;
    const jupiter = bodies.find((b) => b.name === "Jupiter");
    if (jupiter && distance(rocket.position, jupiter.position) < jupiter.radius * 700) return jupiter;
    return bodies.find((b) => b.name === "Sun") || null;
  }

  function speedRelativeTo(rocket, refBody) {
    if (!refBody) return speed(rocket);
    const dvx = rocket.velocity.x - refBody.velocity.x;
    const dvy = rocket.velocity.y - refBody.velocity.y;
    const dvz = rocket.velocity.z - refBody.velocity.z;
    return Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
  }

  function closingSpeed(rocket, targetBody) {
    const dx = targetBody.position.x - rocket.position.x;
    const dy = targetBody.position.y - rocket.position.y;
    const dz = targetBody.position.z - rocket.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist === 0) return 0;
    const ux = dx / dist, uy = dy / dist, uz = dz / dist;
    const dvx = rocket.velocity.x - targetBody.velocity.x;
    const dvy = rocket.velocity.y - targetBody.velocity.y;
    const dvz = rocket.velocity.z - targetBody.velocity.z;
    return dvx * ux + dvy * uy + dvz * uz;
  }

  function getCurrentFlybyTargetName() {
    const targets = (activeScenario && activeScenario.flybyTargets) || [];
    if (!targets.length) return null;
    return targets[Math.min(flybyTargetIndex, targets.length - 1)];
  }

  function advanceFlybyTarget(rocket) {
    const targets = (activeScenario && activeScenario.flybyTargets) || [];
    if (!targets.length || flybyTargetIndex >= targets.length - 1) return;
    const targetBody = bodies.find((b) => b.name === targets[flybyTargetIndex]);
    if (!targetBody) return;
    const dist = distance(rocket.position, targetBody.position);
    if (dist < flybyTargetMinDist) flybyTargetMinDist = dist;
    if (flybyTargetMinDist < targetBody.radius * 200 && dist > flybyTargetMinDist * 2) {
      flybyTargetIndex++;
      flybyTargetMinDist = Infinity;
    }
  }

  function updateReadouts() {
    timeReadout.textContent = formatElapsedTime(elapsedSeconds);

    const rocket = bodies.find((body) => body.name === "Rocket");

    if (!rocket) {
      if (compactRocketSpeedReadout) {
        compactRocketSpeedReadout.textContent = t("notLaunched");
      }
      const flybyTargetName = getCurrentFlybyTargetName();
      const flybyTargetBody = flybyTargetName ? bodies.find((b) => b.name === flybyTargetName) : null;
      const earth = bodies.find((b) => b.name === "Earth");
      const origin = earth || bodies[0];
      if (flybyTargetBody && origin && flybyTargetBody !== origin) {
        const dist = distance(origin.position, flybyTargetBody.position);
        if (targetDistanceLabel) targetDistanceLabel.textContent = t("distanceToTarget", { target: bodyLabel(flybyTargetName) });
        if (targetDistanceReadout) targetDistanceReadout.textContent = formatDist(dist);
      } else {
        if (targetDistanceLabel) targetDistanceLabel.textContent = t("distanceToNextTarget");
        if (targetDistanceReadout) targetDistanceReadout.textContent = "—";
      }
      if (speedToTargetReadout) speedToTargetReadout.textContent = "—";
      updateMissionReadouts(null);
      return;
    }

    advanceFlybyTarget(rocket);

    const refBody = speedRefBody(rocket);
    const spd = speedRelativeTo(rocket, refBody);

    const missionStatus = rocketSim && rocketSim.missionStatus(rocketMissionState, bodies);
    if (compactRocketSpeedReadout) {
      compactRocketSpeedReadout.textContent = `${(spd / 1000).toFixed(2)} km/s`;
    }

    const flybyTargetName = getCurrentFlybyTargetName();
    const flybyTargetBody = flybyTargetName ? bodies.find((b) => b.name === flybyTargetName) : null;
    if (flybyTargetBody) {
      const dist = distance(rocket.position, flybyTargetBody.position);
      if (targetDistanceLabel) targetDistanceLabel.textContent = t("distanceToTarget", { target: bodyLabel(flybyTargetName) });
      if (targetDistanceReadout) targetDistanceReadout.textContent = formatDist(dist);
      const cs = closingSpeed(rocket, flybyTargetBody);
      if (speedToTargetReadout) {
        const sign = cs >= 0 ? "+" : "";
        speedToTargetReadout.textContent = `${sign}${(cs / 1000).toFixed(2)} km/s`;
      }
    } else {
      if (targetDistanceLabel) targetDistanceLabel.textContent = t("distanceToNextTarget");
      if (targetDistanceReadout) targetDistanceReadout.textContent = "—";
      if (speedToTargetReadout) speedToTargetReadout.textContent = "—";
    }

    updateMissionReadouts(missionStatus);
  }

  function updateMissionReadouts(missionStatus) {
    const mission = currentMission();
    if (!mission) {
      missionTimeReadout.textContent = t("noData");
      if (compactMissionTimeReadout) {
        compactMissionTimeReadout.textContent = t("noData");
      }
      flightPhaseReadout.textContent = t("noData");
      nextBurnReadout.textContent = t("noData");
      throttleReadout.textContent = t("noData");
      fuelReadout.textContent = t("noData");
      orbitInclinationReadout.textContent = t("noData");
      return;
    }

    if (!missionStatus) {
      missionTimeReadout.textContent = formatElapsedTime(0);
      if (compactMissionTimeReadout) {
        compactMissionTimeReadout.textContent = formatElapsedTime(0);
      }
      flightPhaseReadout.textContent = t("ready");
      nextBurnReadout.textContent = firstBurnTextSimple(mission);
      throttleReadout.textContent = "0%";
      fuelReadout.textContent = `${(mission.vehicle.fuelMassKg / 1000).toFixed(1)} t`;
      orbitInclinationReadout.textContent = t("targetTilt", { deg: (mission.targetOrbit || {}).inclinationDeg || "?" });
      return;
    }

    missionTimeReadout.textContent = formatElapsedTime(missionStatus.missionTime);
    if (compactMissionTimeReadout) {
      compactMissionTimeReadout.textContent = formatElapsedTime(missionStatus.missionTime);
    }
    flightPhaseReadout.textContent = humanFlightPhase(missionStatus);
    nextBurnReadout.textContent = missionStatus.nextBurnName
      ? t("nextBurnIn", { name: missionStepLabel(missionStatus.nextBurnName), time: formatDuration(missionStatus.nextBurnInSeconds) })
      : t("noMoreBurns");
    throttleReadout.textContent = `${(missionStatus.throttle * 100).toFixed(0)}%`;
    fuelReadout.textContent = `${(missionStatus.fuelMass / 1000).toFixed(1)} t (${missionStatus.fuelPercent.toFixed(0)}%)`;
    orbitInclinationReadout.textContent = Number.isFinite(missionStatus.inclinationDeg)
      ? `${missionStatus.inclinationDeg.toFixed(1)} deg`
      : t("targetTilt", { deg: missionStatus.targetInclinationDeg || "?" });
  }

  function humanFlightPhase(missionStatus) {
    if (missionStatus.throttle > 0) {
      return missionStatus.commandName
        ? `${t("firing")}: ${missionStepLabel(missionStatus.commandName)}`
        : t("firing");
    }
    return t("coasting");
  }

  function firstBurnTextSimple(mission) {
    const first = (mission.program || []).find((burn) => (burn.throttle || 0) > 0);
    return first
      ? t("nextBurnIn", { name: missionStepLabel(first.name), time: formatDuration(first.start) })
      : t("noMoreBurns");
  }

  function missionStepLabel(name) {
    const lower = (name || "").toLowerCase();
    if (lower.includes("liftoff") || lower.includes("vertical climb")) return missionStepText("launch");
    if (lower.includes("parking orbit")) return missionStepText("parkingOrbit");
    if (lower.includes("gravity turn")) return missionStepText("gravityTurn");
    if (lower.includes("injection") || lower.includes("tli")) return missionStepText("injection");
    if (lower.includes("correction") || lower.includes("mcc")) return missionStepText("correction");
    if (lower.includes("coast")) return missionStepText("coast");
    if (lower.includes("loi")) return missionStepText("lunarOrbit");
    if (lower.includes("circular")) return missionStepText("circularize");
    if (lower.includes("descent") || lower.includes("pdi")) return missionStepText("landing");
    if (lower.includes("deorbit")) return missionStepText("deorbit");
    return name || t("none");
  }

  function missionStepText(key) {
    const labels = {
      en: { launch: "launch", parkingOrbit: "enter low orbit", gravityTurn: "turn toward orbit", injection: "leave for target", correction: "course correction", coast: "coast", lunarOrbit: "enter lunar orbit", circularize: "round out orbit", landing: "powered landing", deorbit: "return from orbit" },
      ru: { launch: "запуск", parkingOrbit: "выход на низкую орбиту", gravityTurn: "разворот к орбите", injection: "полет к цели", correction: "коррекция курса", coast: "полет без тяги", lunarOrbit: "выход на орбиту Луны", circularize: "выравнивание орбиты", landing: "посадка с двигателем", deorbit: "сход с орбиты" },
      fil: { launch: "launch", parkingOrbit: "pasok sa mababang orbit", gravityTurn: "liko papunta sa orbit", injection: "alis papunta sa target", correction: "tama ng kurso", coast: "coast", lunarOrbit: "pasok sa orbit ng Buwan", circularize: "paikutin ang orbit", landing: "landing gamit makina", deorbit: "balik mula orbit" },
      id: { launch: "peluncuran", parkingOrbit: "masuk orbit rendah", gravityTurn: "belok menuju orbit", injection: "berangkat ke target", correction: "koreksi lintasan", coast: "melayang", lunarOrbit: "masuk orbit Bulan", circularize: "membulatkan orbit", landing: "pendaratan bermesin", deorbit: "turun dari orbit" },
      zh: { launch: "发射", parkingOrbit: "进入近地轨道", gravityTurn: "转向轨道", injection: "飞向目标", correction: "修正航线", coast: "滑行", lunarOrbit: "进入月球轨道", circularize: "圆化轨道", landing: "动力着陆", deorbit: "离轨返回" },
      ko: { launch: "발사", parkingOrbit: "저궤도 진입", gravityTurn: "궤도로 선회", injection: "목표로 출발", correction: "항로 수정", coast: "무추력 비행", lunarOrbit: "달 궤도 진입", circularize: "궤도 원형화", landing: "동력 착륙", deorbit: "궤도 이탈" },
      ja: { launch: "打ち上げ", parkingOrbit: "低軌道へ入る", gravityTurn: "軌道へ旋回", injection: "目標へ出発", correction: "進路修正", coast: "惰性飛行", lunarOrbit: "月軌道へ入る", circularize: "軌道を円形化", landing: "動力着陸", deorbit: "軌道離脱" }
    };
    return (labels[currentLanguage] && labels[currentLanguage][key]) || labels.en[key];
  }

  function syncReferenceOrbits() {
    referenceOrbitGroup.clear();
    for (const orbit of activeScenario.referenceOrbits || []) {
      createReferenceOrbit(orbit.radius, orbit.color, orbit.inclination || 0);
    }
  }

  function createReferenceOrbit(radiusMeters, color, inclinationDegrees) {
    const points = [];
    const inclination = inclinationDegrees * Math.PI / 180;
    const cosInc = Math.cos(inclination);
    const sinInc = Math.sin(inclination);

    for (let i = 0; i <= 256; i += 1) {
      const angle = i / 256 * Math.PI * 2;
      const x = Math.cos(angle) * radiusMeters * getViewConfig().metersToUnits;
      const y = Math.sin(angle) * radiusMeters * cosInc * getViewConfig().metersToUnits;
      const z = Math.sin(angle) * radiusMeters * sinInc * getViewConfig().metersToUnits;
      points.push(new THREE.Vector3(x, z, y));
    }

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    referenceOrbitGroup.add(line);
  }

  function updateLaunchSiteMarkers() {
    const earth = bodies.find(b => b.name === 'Earth');
    if (!earth) {
      for (const m of launchSiteMarkers) m.dot.visible = false;
      return;
    }
    const earthPos = toScenePosition(earth.position);
    const earthR = getBodyVisualRadius(earth);
    const dotR = Math.max(0.06, earthR * 0.035);
    const elev = earthR * 1.018;
    const earthMesh = bodyMeshes.get("Earth");
    const axialRotation = earthMesh && earthMesh.userData.axialGroup
      ? earthMesh.userData.axialGroup.quaternion
      : null;

    for (const { site, dot } of launchSiteMarkers) {
      const theta = site.lonRad - getBodySpinAngle(earth);
      _siteVec.set(
        Math.cos(site.latRad) * Math.cos(theta),
        Math.sin(site.latRad),
        Math.cos(site.latRad) * Math.sin(theta)
      );
      if (axialRotation) _siteVec.applyQuaternion(axialRotation);
      dot.scale.setScalar(dotR);
      dot.position.set(
        earthPos.x + elev * _siteVec.x,
        earthPos.y + elev * _siteVec.y,
        earthPos.z + elev * _siteVec.z
      );
      dot.visible = true;
    }
  }

  function createStars() {
    const count = 2600;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = 850 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: "#dfe7ff", size: 0.8, sizeAttenuation: true })
    );
  }

  function resizeRenderer() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function toScenePosition(position) {
    const metersToUnits = getViewConfig().metersToUnits;
    return new THREE.Vector3(
      position.x * metersToUnits,
      position.z * metersToUnits,
      position.y * metersToUnits
    );
  }

  function getViewConfig() {
    const view = activeScenario.view || {};
    return {
      metersToUnits: view.metersToUnits || DEFAULT_METERS_TO_UNITS,
      radiusScale: view.radiusScale || DEFAULT_RADIUS_TO_UNITS,
      useDisplayScale: view.useDisplayScale === true,
      minBodyRadius: view.minBodyRadius ?? 0.45,
      markers: view.markers !== false
    };
  }

  function getBodyVisualRadius(body) {
    const view = getViewConfig();
    const displayScale = view.useDisplayScale ? body.displayScale : 1;
    return Math.max(view.minBodyRadius, body.radius * displayScale * view.radiusScale);
  }

  function applyEarthEllipsoidScale(mesh, body, radius) {
    const ellipsoid = body.ellipsoid || (rocketSim && rocketSim.earthEllipsoid());
    if (!ellipsoid) {
      mesh.scale.setScalar(radius);
      return;
    }
    const eqScale = ellipsoid.equatorialRadiusM / body.radius;
    const polScale = ellipsoid.polarRadiusM / body.radius;
    // scene Y = physics Z = Earth rotation axis = polar direction
    if (mesh.userData && mesh.userData.surface) {
      mesh.scale.setScalar(radius);
      mesh.userData.surface.scale.set(eqScale, polScale, eqScale);
    } else {
      mesh.scale.set(radius * eqScale, radius * polScale, radius * eqScale);
    }
  }

  function shouldShowMarker(body) {
    const radius = getBodyVisualRadius(body);
    return body.name === "Rocket" || radius < 0.3;
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function hasSelectOption(select, value) {
    return Array.from(select.options).some((option) => option.value === value);
  }
