/**
 * Content filter — blocks profanity, slurs, romantic/sexual language,
 * and offensive content in English and Hindi/Hinglish.
 *
 * Strategy: build a single regex from all blocked terms, test the
 * normalised message (lowercased, leet-speak collapsed) against it.
 * Returns { blocked: boolean, reason: string }.
 */

// ---------------------------------------------------------------------------
// Word list
// ---------------------------------------------------------------------------

const BLOCKED_TERMS = [
  // ── English profanity & slurs ────────────────────────────────────────────
  'fuck', 'fucker', 'fucking', 'fucked', 'fucks', 'f.u.c.k',
  'shit', 'shits', 'shitty', 'bullshit',
  'bitch', 'bitches', 'bitching',
  'ass', 'asshole', 'arsehole', 'arse',
  'bastard', 'bastards',
  'cunt', 'cunts',
  'dick', 'dicks', 'dickhead',
  'cock', 'cocks', 'cocksucker',
  'pussy', 'pussies',
  'whore', 'whores',
  'slut', 'sluts',
  'nigger', 'niggers', 'nigga',
  'faggot', 'fag', 'dyke',
  'retard', 'retarded',
  'motherfucker', 'motherf',
  'son of a bitch', 'sonofabitch',
  'damn', 'damnit',
  'crap',
  'idiot', 'moron', 'stupid',
  'kill yourself', 'kys',
  'go to hell', 'go fuck',

  // ── Sexual / porn terms ──────────────────────────────────────────────────
  'porn', 'porno', 'pornography',
  'nude', 'nudes', 'nudity',
  'naked', 'nakedpics',
  'sex', 'sexy', 'sexting', 'sext',
  'blowjob', 'blow job', 'handjob', 'hand job',
  'penis', 'vagina', 'boobs', 'boob', 'booty',
  'anal', 'oral sex',
  'cum', 'cumshot',
  'masturbat', 'masturbation',
  'dildo', 'vibrator',
  'erotic', 'erotica',
  'xxx', 'onlyfans',
  'naughty', 'horny',

  // ── Romantic / relationship solicitation ────────────────────────────────
  'i love you', 'i luv u', 'i luv you', 'ilove you',
  'i hate you', 'i h8 you',
  'will you be my girlfriend', 'will you be my boyfriend',
  'be my gf', 'be my bf',
  'i like you', 'i fancy you',
  'you are beautiful', 'ur beautiful', 'u r beautiful',
  'you are hot', 'ur hot', 'u r hot',
  'you are sexy', 'ur sexy',
  'send nudes', 'send pics', 'send photo',
  'number doge', 'number do', 'apna number do', 'number share',
  'personal number', 'whatsapp number', 'instagram id',
  'date me', 'date with me', 'lets meet',

  // ── Hindi / Hinglish gaaliyan ────────────────────────────────────────────
  'madarchod', 'maderchod', 'maadar chod', 'madarchhod',
  'behenchod', 'behen chod', 'bhenchod', 'bc',
  'chutiya', 'chutiye', 'chut',
  'gaandu', 'gandu', 'gand',
  'bhosdike', 'bhosdiwale', 'bhosdi',
  'randi', 'randwa', 'rande',
  'harami', 'haramzada', 'haramzadi',
  'saala', 'saali',
  'lauda', 'lavda', 'lund',
  'tere maa ki', 'teri maa',
  'teri behen', 'teri behan',
  'bakwaas', 'bakwas',
  'kamina', 'kamine',
  'kutte', 'kutta',
  'suar', 'suwar',
  'ullu', 'gadha',
  'jhatu', 'jhaat',
  'bsdk', 'bkl', 'mkl', 'mkc',

  // ── Threat / harassment ──────────────────────────────────────────────────
  'i will kill', 'i will hurt', 'i will find you',
  'you will die', 'get lost', 'go die',
  'harassment', 'threaten', 'stalk',
];

// ---------------------------------------------------------------------------
// Build a single, fast regex (word-boundary aware, case-insensitive)
// We normalise the input first (remove spaces inside words, leet → letters)
// ---------------------------------------------------------------------------

// Sort by length desc so longer phrases match before their sub-strings
const sorted = [...BLOCKED_TERMS].sort((a, b) => b.length - a.length);

// Escape special regex chars in each term
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Build pattern — use \b where possible, but spaces inside phrases need
// a looser match (allow any whitespace between words)
const patternParts = sorted.map(term => {
  const escaped = escape(term).replace(/ +/g, '[\\s_-]*');
  // Single word → word-boundary; phrase → no extra boundary needed
  return term.includes(' ') ? escaped : `\\b${escaped}\\b`;
});

const BLOCK_REGEX = new RegExp(patternParts.join('|'), 'i');

// ---------------------------------------------------------------------------
// Normalise helper — collapses common leet-speak substitutions
// ---------------------------------------------------------------------------
function normalise(text) {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    .replace(/\+/g, 't')
    .replace(/\*/g, '') // asterisk used to mask letters — strip it
    .replace(/\.+/g, '') // dots used to split letters — strip them
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a message contains blocked content.
 * @param {string} message
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function checkContent(message) {
  if (!message || typeof message !== 'string') return { blocked: false };

  const normalised = normalise(message);

  if (BLOCK_REGEX.test(normalised)) {
    return {
      blocked: true,
      reason: 'Your message contains inappropriate content and was not sent.',
    };
  }

  return { blocked: false };
}
