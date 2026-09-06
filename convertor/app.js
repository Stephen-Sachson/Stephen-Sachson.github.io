const sourceText = document.querySelector("#sourceText");
const arabicText = document.querySelector("#arabicText");
const hebrewText = document.querySelector("#hebrewText");
const hebrewVowelsButton = document.querySelector("#hebrewVowelsButton");
const clearButton = document.querySelector("#clearButton");
const statusText = document.querySelector("#statusText");
const copyButtons = document.querySelectorAll("[data-copy]");

let conversionTimer = null;
let showHebrewVowels = false;

const katakanaStart = 0x30a1;
const katakanaEnd = 0x30f6;
const hiraganaOffset = 0x60;
const smallKana = new Set(["ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ゃ", "ゅ", "ょ", "ゎ", "ゕ", "ゖ"]);
const reducedVowels = {
  ゃ: "\u05b2",
  ゅ: "\u05b1",
  ょ: "\u05b3"
};
const vowelMarks = {
  a: "\u05b7",
  i: "\u05b4",
  u: "\u05b6",
  e: "\u05b5",
  o: "\u05b8",
  n: "\u05b0"
};

const hebrewFinalForms = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" };

const kanaMap = {
  あ: { arabic: "ا", hebrew: "א" },
  い: { arabic: "ي", hebrew: "י" },
  う: { arabic: "و", hebrew: "ו" },
  え: { arabic: "ا", hebrew: "א" },
  お: { arabic: "ا", hebrew: "א" },

  か: { arabic: "ك", hebrew: "כ" },
  き: { arabic: "ك", hebrew: "כ" },
  く: { arabic: "ك", hebrew: "כ" },
  け: { arabic: "ك", hebrew: "כ" },
  こ: { arabic: "ك", hebrew: "כ" },

  さ: { arabic: "س", hebrew: "ס" },
  し: { arabic: "ش", hebrew: "ש" },
  す: { arabic: "س", hebrew: "ס" },
  せ: { arabic: "س", hebrew: "ס" },
  そ: { arabic: "س", hebrew: "ס" },

  た: { arabic: "ت", hebrew: "ט" },
  ち: { arabic: "چ", hebrew: "ח" },
  つ: { arabic: "ث", hebrew: "צ" },
  て: { arabic: "ت", hebrew: "ט" },
  と: { arabic: "ت", hebrew: "ט" },

  な: { arabic: "ن", hebrew: "נ" },
  に: { arabic: "ن", hebrew: "נ" },
  ぬ: { arabic: "ن", hebrew: "נ" },
  ね: { arabic: "ن", hebrew: "נ" },
  の: { arabic: "ن", hebrew: "נ" },

  は: { arabic: "ه", hebrew: "ה" },
  ひ: { arabic: "ه", hebrew: "ה" },
  ふ: { arabic: "ف", hebrew: "פ" },
  へ: { arabic: "ه", hebrew: "ה" },
  ほ: { arabic: "ه", hebrew: "ה" },

  ま: { arabic: "م", hebrew: "מ" },
  み: { arabic: "م", hebrew: "מ" },
  む: { arabic: "م", hebrew: "מ" },
  め: { arabic: "م", hebrew: "מ" },
  も: { arabic: "م", hebrew: "מ" },

  や: { arabic: "ي", hebrew: "י" },
  ゆ: { arabic: "ي", hebrew: "י" },
  よ: { arabic: "ي", hebrew: "י" },

  ら: { arabic: "ر", hebrew: "ר" },
  り: { arabic: "ر", hebrew: "ר" },
  る: { arabic: "ر", hebrew: "ר" },
  れ: { arabic: "ر", hebrew: "ר" },
  ろ: { arabic: "ر", hebrew: "ר" },

  わ: { arabic: "و", hebrew: "ו" },
  を: { arabic: "و", hebrew: "ו" },
  ん: { arabic: "ن", hebrew: "נ" },
  っ: { arabic: "ع", hebrew: "ע" },

  が: { arabic: "غ", hebrew: "ג" },
  ぎ: { arabic: "غ", hebrew: "ג" },
  ぐ: { arabic: "غ", hebrew: "ג" },
  げ: { arabic: "غ", hebrew: "ג" },
  ご: { arabic: "غ", hebrew: "ג" },

  ざ: { arabic: "ز", hebrew: "ז" },
  じ: { arabic: "ج", hebrew: "ת" },
  ず: { arabic: "ز", hebrew: "ז" },
  ぜ: { arabic: "ز", hebrew: "ז" },
  ぞ: { arabic: "ز", hebrew: "ז" },

  だ: { arabic: "د", hebrew: "ד" },
  ぢ: { arabic: "ج", hebrew: "ג" },
  づ: { arabic: "ز", hebrew: "ז" },
  で: { arabic: "د", hebrew: "ד" },
  ど: { arabic: "د", hebrew: "ד" },

  ば: { arabic: "ب", hebrew: "ב" },
  び: { arabic: "ب", hebrew: "ב" },
  ぶ: { arabic: "ب", hebrew: "ב" },
  べ: { arabic: "ب", hebrew: "ב" },
  ぼ: { arabic: "ب", hebrew: "ב" },

  ぱ: { arabic: "پ", hebrew: "פ" },
  ぴ: { arabic: "پ", hebrew: "פ" },
  ぷ: { arabic: "پ", hebrew: "פ" },
  ぺ: { arabic: "پ", hebrew: "פ" },
  ぽ: { arabic: "پ", hebrew: "פ" },

  ゔ: { arabic: "ف", hebrew: "ו" }
};

function katakanaToHiragana(value) {
  return [...value]
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code >= katakanaStart && code <= katakanaEnd) {
        return String.fromCharCode(code - hiraganaOffset);
      }
      return character;
    })
    .join("");
}

function getLongVowelKana(character) {
  const vowel = getKanaVowel(character);

  if (vowel === "a") return "a";
  if (vowel === "i" || vowel === "e") return "i";
  if (vowel === "u" || vowel === "o") return "u";

  return "";
}

function getLongVowelLetter(character, target) {
  const vowel = getLongVowelKana(character);

  if (target === "arabic") {
    if (vowel === "a") return "ا";
    if (vowel === "i") return "ي";
    if (vowel === "u") return "و";
  }

  if (target === "hebrew") {
    if (vowel === "a") return "א";
    if (vowel === "i") return "י";
    if (vowel === "u") return "ו";
  }

  return "";
}

function convertKana(value, target) {
  if (target === "hebrew") {
    return convertHebrew(value);
  }

  const characters = [...katakanaToHiragana(value)];

  return characters
    .map((character, index) => {
      if (smallKana.has(character)) {
        return "";
      }

      if (character === "ー") {
        const previousCharacter = characters[index - 1];
        return getLongVowelLetter(previousCharacter, target);
      }

      return kanaMap[character]?.[target] ?? character;
    })
    .join("");
}

function getKanaVowel(character) {
  if ("あかさたなはまやらわがざだばぱ".includes(character)) return "a";
  if ("きにひみりぎびぴ".includes(character)) return "i";
  if ("くすぬふむゆるぐずづぶぷゔ".includes(character)) return "u";
  if ("えけせてねへめれげぜでべぺ".includes(character)) return "e";
  if ("おこそとのほもよろをごぞどぼぽ".includes(character)) return "o";
  if ("んっ".includes(character)) return "n";
  return "";
}

function getHebrewMark(character, nextCharacter) {
  if (!showHebrewVowels) {
    return "";
  }

  if (reducedVowels[nextCharacter]) {
    return reducedVowels[nextCharacter];
  }

  return vowelMarks[getKanaVowel(character)] ?? "";
}

function convertHebrew(value) {
  const characters = [...katakanaToHiragana(value)];

  return characters
    .map((character, index) => {
      if (smallKana.has(character)) {
        return "";
      }

      if (character === "ー") {
        const previousCharacter = characters[index - 1];
        return getLongVowelLetter(previousCharacter, "hebrew");
      }

      let letter = kanaMap[character]?.hebrew ?? character;
      const nextCharacter = characters[index + 1];

      // Use Hebrew final forms when this is the end of a word.
      if (
        hebrewFinalForms[letter] &&
        (nextCharacter === undefined || /\s/.test(nextCharacter))
      ) {
        letter = hebrewFinalForms[letter];
      }

      const mark = kanaMap[character]
        ? getHebrewMark(character, nextCharacter)
        : "";

      return letter + mark;
    })
    .join("");
}

function scheduleConversion() {
  window.clearTimeout(conversionTimer);
  conversionTimer = window.setTimeout(convertText, 80);
}

function convertText() {
  const text = sourceText.value;

  arabicText.textContent = convertKana(text, "arabic");
  hebrewText.textContent = convertKana(text, "hebrew");
}

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(`#${button.dataset.copy}`);
    await navigator.clipboard.writeText(target.textContent);
    button.classList.add("copied");
    window.setTimeout(() => button.classList.remove("copied"), 900);
  });
});

sourceText.addEventListener("input", scheduleConversion);
clearButton.addEventListener("click", () => {
  sourceText.value = "";
  sourceText.focus();
  scheduleConversion();
});

hebrewVowelsButton.addEventListener("click", () => {
  showHebrewVowels = !showHebrewVowels;
  hebrewVowelsButton.setAttribute("aria-pressed", String(showHebrewVowels));
  hebrewVowelsButton.textContent = showHebrewVowels ? "Hide Hebrew vowels" : "Show Hebrew vowels";
  convertText();
});

statusText.textContent = "Kana only. Small kana are omitted.";
convertText();

const canvas = document.querySelector("#glyphCanvas");
const context = canvas.getContext("2d");
const glyphs = ["あ", "い", "う", "え", "お", "か", "さ", "た", "な", "ま", "みょ", "ん", "ا", "א"];
let particles = [];

function resizeCanvas() {
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  particles = Array.from({ length: Math.max(18, Math.floor(window.innerWidth / 54)) }, () => ({
    glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: 20 + Math.random() * 34,
    speed: 0.12 + Math.random() * 0.32,
    alpha: 0.08 + Math.random() * 0.14
  }));
}

function drawCanvas() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  context.textAlign = "center";

  particles.forEach((particle) => {
    context.globalAlpha = particle.alpha;
    context.font = `700 ${particle.size}px serif`;
    context.fillStyle = particle.glyph === "ا" || particle.glyph === "א" ? "#9b2f27" : "#2f694f";
    context.fillText(particle.glyph, particle.x, particle.y);
    particle.y -= particle.speed;
    particle.x += Math.sin((particle.y + particle.size) * 0.01) * 0.12;

    if (particle.y < -40) {
      particle.y = window.innerHeight + 40;
      particle.x = Math.random() * window.innerWidth;
    }
  });

  context.globalAlpha = 1;
  window.requestAnimationFrame(drawCanvas);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
drawCanvas();
