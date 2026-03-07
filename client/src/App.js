import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import Editor from "@monaco-editor/react";
import './App.css';

// ─────────────────────────────────────────────
// LANGUAGE CONFIG
// ─────────────────────────────────────────────
const LANGUAGE_META = {
  javascript: { label: 'JAVASCRIPT', monacoLang: 'javascript', icon: '🟨' },
  python:     { label: 'PYTHON',     monacoLang: 'python',     icon: '🐍' },
  java:       { label: 'JAVA',       monacoLang: 'java',       icon: '☕' },
  cpp:        { label: 'C++',        monacoLang: 'cpp',        icon: '⚙️' },
  sql:        { label: 'SQL',        monacoLang: 'sql',        icon: '🗄️' },
};

// ─────────────────────────────────────────────
// CHALLENGES
// ─────────────────────────────────────────────
const CHALLENGES = [
  {
    id: 1, title: "Fix the Adder", points: 80,
    description: "This function should return the SUM of two numbers, but it's subtracting instead.",
    variants: {
      javascript: { starterCode: `function add(a, b) {\n  return a - b; // bug here\n}`, fnName: 'add', tests: [[2,3,5],[10,5,15],[0,0,0]] },
      python:     { starterCode: `def add(a, b):\n    return a - b  # bug here`, fixPatterns: ['return\\s+a\\s*\\+\\s*b'], bugPatterns: ['a\\s*-\\s*b'] },
      java:       { starterCode: `public int add(int a, int b) {\n    return a - b; // bug here\n}`, fixPatterns: ['return\\s+a\\s*\\+\\s*b'], bugPatterns: ['a\\s*-\\s*b'] },
      cpp:        { starterCode: `int add(int a, int b) {\n    return a - b; // bug here\n}`, fixPatterns: ['return\\s+a\\s*\\+\\s*b'], bugPatterns: ['a\\s*-\\s*b'] },
      sql:        { starterCode: `-- Should return total price (quantity * unit_price)\nSELECT quantity - unit_price AS total_price\nFROM orders;`, fixPatterns: ['quantity\\s*\\*\\s*unit_price'], bugPatterns: ['quantity\\s*-\\s*unit_price'] },
    },
  },
  {
    id: 2, title: "Off-by-One Loop", points: 100,
    description: "Should return the sum of 1 through n INCLUSIVE, but it's missing the last number.",
    variants: {
      javascript: { starterCode: `function sumTo(n) {\n  let total = 0;\n  for (let i = 1; i < n; i++) { // bug here\n    total += i;\n  }\n  return total;\n}`, fnName: 'sumTo', tests: [[5,15],[3,6],[1,1]] },
      python:     { starterCode: `def sum_to(n):\n    total = 0\n    for i in range(1, n):  # bug here\n        total += i\n    return total`, fixPatterns: ['range\\s*\\(\\s*1\\s*,\\s*n\\s*\\+\\s*1\\s*\\)'], bugPatterns: ['range\\s*\\(\\s*1\\s*,\\s*n\\s*\\)'] },
      java:       { starterCode: `public int sumTo(int n) {\n    int total = 0;\n    for (int i = 1; i < n; i++) { // bug here\n        total += i;\n    }\n    return total;\n}`, fixPatterns: ['i\\s*<=\\s*n'], bugPatterns: ['i\\s*<\\s*n'] },
      cpp:        { starterCode: `int sumTo(int n) {\n    int total = 0;\n    for (int i = 1; i < n; i++) { // bug here\n        total += i;\n    }\n    return total;\n}`, fixPatterns: ['i\\s*<=\\s*n'], bugPatterns: ['i\\s*<\\s*n'] },
      sql:        { starterCode: `-- Should count employees including level 5\nSELECT COUNT(*) FROM employees\nWHERE level < 5;`, fixPatterns: ['level\\s*<=\\s*5'], bugPatterns: ['level\\s*<\\s*5'] },
    },
  },
  {
    id: 3, title: "Broken Multiplier", points: 100,
    description: "Should multiply all elements in an array, but the initial value is wrong.",
    variants: {
      javascript: { starterCode: `function product(arr) {\n  return arr.reduce((acc, val) => acc * val, 0); // bug here\n}`, fnName: 'product', tests: [[[2,3,4],24],[[5,5],25],[[1,2,3],6]] },
      python:     { starterCode: `from functools import reduce\ndef product(arr):\n    return reduce(lambda acc, val: acc * val, arr, 0)  # bug here`, fixPatterns: ['arr\\s*,\\s*1\\s*\\)'], bugPatterns: ['arr\\s*,\\s*0\\s*\\)'] },
      java:       { starterCode: `public int product(int[] arr) {\n    int result = 0; // bug here\n    for (int val : arr) result *= val;\n    return result;\n}`, fixPatterns: ['int\\s+result\\s*=\\s*1'], bugPatterns: ['int\\s+result\\s*=\\s*0'] },
      cpp:        { starterCode: `int product(vector<int>& arr) {\n    int result = 0; // bug here\n    for (int val : arr) result *= val;\n    return result;\n}`, fixPatterns: ['result\\s*=\\s*1'], bugPatterns: ['result\\s*=\\s*0'] },
      sql:        { starterCode: `SELECT id, value,\n  EXP(SUM(LN(value)) OVER (ORDER BY id)) * 0 AS running_product\nFROM items;`, fixPatterns: ['\\*\\s*1\\b'], bugPatterns: ['\\*\\s*0\\b'] },
    },
  },
  {
    id: 4, title: "Reversed Condition", points: 80,
    description: "Should return true if a number is EVEN, but the condition is backwards.",
    variants: {
      javascript: { starterCode: `function isEven(n) {\n  return n % 2 !== 0; // bug here\n}`, fnName: 'isEven', tests: [[4,true],[7,false],[0,true]] },
      python:     { starterCode: `def is_even(n):\n    return n % 2 != 0  # bug here`, fixPatterns: ['n\\s*%\\s*2\\s*==\\s*0'], bugPatterns: ['n\\s*%\\s*2\\s*!=\\s*0'] },
      java:       { starterCode: `public boolean isEven(int n) {\n    return n % 2 != 0; // bug here\n}`, fixPatterns: ['n\\s*%\\s*2\\s*==\\s*0'], bugPatterns: ['n\\s*%\\s*2\\s*!=\\s*0'] },
      cpp:        { starterCode: `bool isEven(int n) {\n    return n % 2 != 0; // bug here\n}`, fixPatterns: ['n\\s*%\\s*2\\s*==\\s*0'], bugPatterns: ['n\\s*%\\s*2\\s*!=\\s*0'] },
      sql:        { starterCode: `SELECT * FROM orders\nWHERE order_id % 2 != 0;`, fixPatterns: ['order_id\\s*%\\s*2\\s*=\\s*0'], bugPatterns: ['order_id\\s*%\\s*2\\s*!=?\\s*0'] },
    },
  },
  {
    id: 5, title: "String Reverser", points: 120,
    description: "Should reverse a string, but the reverse step is missing.",
    variants: {
      javascript: { starterCode: `function reverseStr(s) {\n  return s.split('').join(''); // bug here\n}`, fnName: 'reverseStr', tests: [['hello','olleh'],['abc','cba'],['x','x']] },
      python:     { starterCode: `def reverse_str(s):\n    return ''.join(list(s))  # bug here`, fixPatterns: ["return\\s+s\\s*\\[\\s*::\\s*-1\\s*\\]|''\\.join\\(reversed\\(s\\)\\)"], bugPatterns: ["''\\.join\\(list\\(s\\)\\)"] },
      java:       { starterCode: `public String reverseStr(String s) {\n    return new StringBuilder(s).toString(); // bug: missing reverse\n}`, fixPatterns: ['\\.reverse\\(\\)'], bugPatterns: ['StringBuilder\\(s\\)\\.toString'] },
      cpp:        { starterCode: `string reverseStr(string s) {\n    // bug: missing reverse\n    return s;\n}`, fixPatterns: ['reverse\\s*\\(\\s*s\\.begin|std::reverse'], bugPatterns: ['return\\s+s\\s*;'] },
      sql:        { starterCode: `SELECT name, name AS reversed_name\nFROM users;`, fixPatterns: ['REVERSE\\s*\\(\\s*name\\s*\\)'], bugPatterns: ['name\\s+AS\\s+reversed_name'] },
    },
  },
  {
    id: 6, title: "Max Finder", points: 120,
    description: "Should return the LARGEST number in an array, but returns the smallest.",
    variants: {
      javascript: { starterCode: `function findMax(arr) {\n  return Math.min(...arr); // bug here\n}`, fnName: 'findMax', tests: [[[3,1,4,1,5],5],[[10,2,8],10],[[1],1]] },
      python:     { starterCode: `def find_max(arr):\n    return min(arr)  # bug here`, fixPatterns: ['return\\s+max\\s*\\(\\s*arr\\s*\\)'], bugPatterns: ['return\\s+min\\s*\\(\\s*arr\\s*\\)'] },
      java:       { starterCode: `public int findMax(int[] arr) {\n    return Arrays.stream(arr).min().getAsInt(); // bug here\n}`, fixPatterns: ['\\.max\\(\\)'], bugPatterns: ['\\.min\\(\\)'] },
      cpp:        { starterCode: `int findMax(vector<int>& arr) {\n    return *min_element(arr.begin(), arr.end()); // bug here\n}`, fixPatterns: ['max_element'], bugPatterns: ['min_element'] },
      sql:        { starterCode: `SELECT MIN(salary) AS highest_salary\nFROM employees;`, fixPatterns: ['MAX\\s*\\(\\s*salary\\s*\\)'], bugPatterns: ['MIN\\s*\\(\\s*salary\\s*\\)'] },
    },
  },
  {
    id: 7, title: "Counter Bug", points: 80,
    description: "Should count how many times a value appears, but the condition is inverted.",
    variants: {
      javascript: { starterCode: `function countVal(arr, val) {\n  return arr.filter(x => x !== val).length; // bug here\n}`, fnName: 'countVal', tests: [[[1,2,2,3,2],2,3],[[5,5,1],5,2],[[1],1,1]] },
      python:     { starterCode: `def count_val(arr, val):\n    return len([x for x in arr if x != val])  # bug here`, fixPatterns: ['x\\s*==\\s*val|arr\\.count\\s*\\(\\s*val\\s*\\)'], bugPatterns: ['x\\s*!=\\s*val'] },
      java:       { starterCode: `public long countVal(int[] arr, int val) {\n    return Arrays.stream(arr).filter(x -> x != val).count(); // bug here\n}`, fixPatterns: ['x\\s*==\\s*val'], bugPatterns: ['x\\s*!=\\s*val'] },
      cpp:        { starterCode: `int countVal(vector<int>& arr, int val) {\n    return count_if(arr.begin(), arr.end(), [val](int x){ return x != val; }); // bug\n}`, fixPatterns: ['return\\s+x\\s*==\\s*val'], bugPatterns: ['return\\s+x\\s*!=\\s*val'] },
      sql:        { starterCode: `SELECT COUNT(*) FROM orders\nWHERE status != 'shipped';`, fixPatterns: ["status\\s*=\\s*'shipped'"], bugPatterns: ["status\\s*!=\\s*'shipped'"] },
    },
  },
  {
    id: 8, title: "Palindrome Check", points: 150,
    description: "Should return true if a string is a palindrome, but the reverse comparison is broken.",
    variants: {
      javascript: { starterCode: `function isPalindrome(s) {\n  return s === s.split('').join(''); // bug here\n}`, fnName: 'isPalindrome', tests: [['racecar',true],['hello',false],['madam',true]] },
      python:     { starterCode: `def is_palindrome(s):\n    return s == ''.join(list(s))  # bug here`, fixPatterns: ["s\\s*==\\s*s\\s*\\[\\s*::\\s*-1\\s*\\]|''\\.join\\(reversed\\(s\\)\\)"], bugPatterns: ["''\\.join\\(list\\(s\\)\\)"] },
      java:       { starterCode: `public boolean isPalindrome(String s) {\n    return s.equals(new StringBuilder(s).toString()); // bug: missing reverse\n}`, fixPatterns: ['\\.reverse\\(\\)\\.toString\\(\\)'], bugPatterns: ['StringBuilder\\(s\\)\\.toString'] },
      cpp:        { starterCode: `bool isPalindrome(string s) {\n    string rev = s;\n    // bug: missing reverse call\n    return s == rev;\n}`, fixPatterns: ['reverse\\s*\\(\\s*rev\\.begin|std::reverse\\s*\\(\\s*rev'], bugPatterns: ['//\\s*bug'] },
      sql:        { starterCode: `SELECT name FROM users\nWHERE name = name; -- bug: should compare to reversed name`, fixPatterns: ['REVERSE\\s*\\(\\s*name\\s*\\)'], bugPatterns: ['WHERE\\s+name\\s*=\\s*name'] },
    },
  },
  {
    id: 9, title: "Null Guard", points: 100,
    description: "Should safely return the length of a string, returning 0 for null/undefined.",
    variants: {
      javascript: { starterCode: `function safeLength(s) {\n  return s.length; // bug: no null check\n}`, fnName: 'safeLength', tests: [['hello',5],['',0],[null,0]] },
      python:     { starterCode: `def safe_length(s):\n    return len(s)  # bug: no None check`, fixPatterns: ['if\\s+(not\\s+s|s\\s+is\\s+None)|return\\s+0\\s+if\\s+(not\\s+s|s\\s+is\\s+None)'], bugPatterns: ['return\\s+len\\s*\\(\\s*s\\s*\\)$'] },
      java:       { starterCode: `public int safeLength(String s) {\n    return s.length(); // bug: no null check\n}`, fixPatterns: ['s\\s*==\\s*null|Objects\\.isNull'], bugPatterns: ['return\\s+s\\.length\\(\\)\\s*;\\s*//\\s*bug'] },
      cpp:        { starterCode: `int safeLength(string* s) {\n    return s->length(); // bug: no null check\n}`, fixPatterns: ['s\\s*==\\s*nullptr|if\\s*\\(!\\s*s'], bugPatterns: ['s->length\\(\\)\\s*;\\s*//\\s*bug'] },
      sql:        { starterCode: `SELECT user_id, LEN(bio) AS bio_length\nFROM profiles;`, fixPatterns: ['COALESCE|ISNULL|IFNULL'], bugPatterns: ['LEN\\s*\\(\\s*bio\\s*\\)\\s*AS\\s+bio_length\\s*$'] },
    },
  },
  {
    id: 10, title: "Wrong Sort Order", points: 120,
    description: "Should sort numbers in ASCENDING order, but it's sorting descending.",
    variants: {
      javascript: { starterCode: `function sortAsc(arr) {\n  return arr.sort((a, b) => b - a); // bug here\n}`, fnName: 'sortAsc', tests: [[[3,1,2],[1,2,3]],[[5,3,8,1],[1,3,5,8]]] },
      python:     { starterCode: `def sort_asc(arr):\n    return sorted(arr, reverse=True)  # bug here`, fixPatterns: ['sorted\\s*\\(\\s*arr\\s*\\)|reverse\\s*=\\s*False'], bugPatterns: ['reverse\\s*=\\s*True'] },
      java:       { starterCode: `public int[] sortAsc(int[] arr) {\n    Arrays.sort(arr, (a, b) -> b - a); // bug here\n    return arr;\n}`, fixPatterns: ['a\\s*-\\s*b|Arrays\\.sort\\s*\\(\\s*arr\\s*\\)'], bugPatterns: ['b\\s*-\\s*a'] },
      cpp:        { starterCode: `vector<int> sortAsc(vector<int> arr) {\n    sort(arr.begin(), arr.end(), greater<int>()); // bug\n    return arr;\n}`, fixPatterns: ['less\\s*<|sort\\s*\\(\\s*arr\\.begin\\(\\)\\s*,\\s*arr\\.end\\(\\)\\s*\\)'], bugPatterns: ['greater\\s*<'] },
      sql:        { starterCode: `SELECT name, price FROM products\nORDER BY price DESC;`, fixPatterns: ['ORDER\\s+BY\\s+price\\s+ASC|ORDER\\s+BY\\s+price\\s*$'], bugPatterns: ['ORDER\\s+BY\\s+price\\s+DESC'] },
    },
  },
  {
    id: 11, title: "Division Guard", points: 130,
    description: "Should return the average of an array, returning 0 for empty arrays.",
    variants: {
      javascript: { starterCode: `function average(arr) {\n  return arr.reduce((a, b) => a + b, 0) / arr.length; // bug: no empty check\n}`, fnName: 'average', tests: [[[2,4,6],4],[[10],10],[[],0]] },
      python:     { starterCode: `def average(arr):\n    return sum(arr) / len(arr)  # bug: no empty check`, fixPatterns: ['if\\s+not\\s+arr|len\\s*\\(\\s*arr\\s*\\)\\s*==\\s*0'], bugPatterns: ['return\\s+sum\\s*\\(\\s*arr\\s*\\)\\s*/\\s*len\\s*\\(\\s*arr\\s*\\)$'] },
      java:       { starterCode: `public double average(int[] arr) {\n    return Arrays.stream(arr).sum() / arr.length; // bug: no empty check\n}`, fixPatterns: ['arr\\.length\\s*==\\s*0'], bugPatterns: ['sum\\(\\)\\s*/\\s*arr\\.length\\s*;\\s*//\\s*bug'] },
      cpp:        { starterCode: `double average(vector<int>& arr) {\n    return accumulate(arr.begin(),arr.end(),0) / arr.size(); // bug\n}`, fixPatterns: ['arr\\.empty\\(\\)|arr\\.size\\(\\)\\s*==\\s*0'], bugPatterns: ['arr\\.size\\(\\)\\s*;\\s*//\\s*bug'] },
      sql:        { starterCode: `SELECT AVG(score) AS avg_score\nFROM quiz_results;`, fixPatterns: ['COALESCE|ISNULL|IFNULL'], bugPatterns: ['SELECT\\s+AVG\\s*\\(\\s*score\\s*\\)\\s*AS\\s+avg_score$'] },
    },
  },
  {
    id: 12, title: "String Compare Bug", points: 110,
    description: "Should check if two strings are equal ignoring case, but case-insensitive check is missing.",
    variants: {
      javascript: { starterCode: `function equalIgnoreCase(a, b) {\n  return a === b; // bug: case sensitive\n}`, fnName: 'equalIgnoreCase', tests: [['Hello','hello',true],['abc','ABC',true],['hi','bye',false]] },
      python:     { starterCode: `def equal_ignore_case(a, b):\n    return a == b  # bug: case sensitive`, fixPatterns: ['a\\.lower\\(\\)\\s*==\\s*b\\.lower\\(\\)|a\\.upper\\(\\)\\s*==\\s*b\\.upper\\(\\)'], bugPatterns: ['return\\s+a\\s*==\\s*b$'] },
      java:       { starterCode: `public boolean equalIgnoreCase(String a, String b) {\n    return a.equals(b); // bug: case sensitive\n}`, fixPatterns: ['equalsIgnoreCase'], bugPatterns: ['a\\.equals\\(\\s*b\\s*\\)\\s*;\\s*//\\s*bug'] },
      cpp:        { starterCode: `bool equalIgnoreCase(string a, string b) {\n    return a == b; // bug: case sensitive\n}`, fixPatterns: ['transform|tolower|toupper|strcasecmp'], bugPatterns: ['return\\s+a\\s*==\\s*b\\s*;\\s*//\\s*bug'] },
      sql:        { starterCode: `SELECT * FROM users\nWHERE name = 'admin'; -- bug: case sensitive`, fixPatterns: ['LOWER|UPPER|ILIKE|COLLATE'], bugPatterns: ["WHERE\\s+name\\s*=\\s*'admin'"] },
    },
  },
];

const ATTACKS = [
  { type: 'blur-mode',   icon: '🌫️', name: 'Blur',   cost: 50 },
  { type: 'shake-mode',  icon: '📳', name: 'Shake',  cost: 40 },
  { type: 'flip-mode',   icon: '🙃', name: 'Flip',   cost: 80 },
  { type: 'mirror-mode', icon: '🪞', name: 'Mirror', cost: 60 },
  { type: 'invert-mode', icon: '🎨', name: 'Invert', cost: 30 },
  { type: 'tiny-mode',   icon: '🔬', name: 'Tiny',   cost: 70 },
];

const STARTING_POINTS = 60;
const WIN_SCORE       = 500;
const MATCH_DURATION  = 5 * 60;
const BONUS_SECONDS   = 10;
const PENALTY_SECONDS = 10;

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────
function runTests(code, challenge, language) {
  if (language === 'javascript') {
    try {
      const { fnName, tests } = challenge.variants.javascript;
      for (const test of tests) {
        const args = test.slice(0, -1);
        const expected = test[test.length - 1];
        // eslint-disable-next-line no-new-func
        const result = new Function(`${code}\nreturn ${fnName}(${args.map(a => JSON.stringify(a)).join(',')});`)();
        if (JSON.stringify(result) !== JSON.stringify(expected)) return false;
      }
      return true;
    } catch { return false; }
  } else {
    const variant = challenge.variants[language];
    if (!variant) return false;
    const { fixPatterns, bugPatterns, starterCode } = variant;
    if (bugPatterns?.some(p => new RegExp(p, 'i').test(code))) return false;
    if (fixPatterns && !fixPatterns.some(p => new RegExp(p, 'i').test(code))) return false;
    if (code.trim() === starterCode.trim()) return false;
    return true;
  }
}

function formatTime(s) {
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────
// SFX ENGINE
// ─────────────────────────────────────────────
const SFX = (() => {
  let ctx = null;
  const g = () => { if (!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)(); return ctx; };
  const p = (fn) => { try { fn(g()); } catch(e) {} };
  return {
    solve:         () => p(c=>[523,659,784,1047].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.value=f;const t=c.currentTime+i*.1;g.gain.setValueAtTime(.3,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.3);})),
    glitch:        () => p(c=>{const o=c.createOscillator(),g=c.createGain(),d=c.createWaveShaper();const cv=new Float32Array(256);for(let i=0;i<256;i++){const x=(i*2)/256-1;cv[i]=(Math.PI+400)*x/(Math.PI+400*Math.abs(x));}d.curve=cv;o.connect(d);d.connect(g);g.connect(c.destination);o.type='sawtooth';o.frequency.setValueAtTime(220,c.currentTime);o.frequency.exponentialRampToValueAtTime(55,c.currentTime+.4);g.gain.setValueAtTime(.4,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.45);o.start();o.stop(c.currentTime+.45);}),
    bonusTime:     () => p(c=>[440,550].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='triangle';o.frequency.value=f;const t=c.currentTime+i*.15;g.gain.setValueAtTime(.2,t);g.gain.exponentialRampToValueAtTime(.001,t+.4);o.start(t);o.stop(t+.4);})),
    penaltyTime:   () => p(c=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.setValueAtTime(120,c.currentTime);o.frequency.exponentialRampToValueAtTime(40,c.currentTime+.3);g.gain.setValueAtTime(.5,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.35);o.start();o.stop(c.currentTime+.35);}),
    win:           () => p(c=>[[392,0],[494,.15],[587,.3],[784,.45],[987,.65]].forEach(([f,t])=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='square';o.frequency.value=f;const st=c.currentTime+t;g.gain.setValueAtTime(.15,st);g.gain.exponentialRampToValueAtTime(.001,st+.4);o.start(st);o.stop(st+.4);})),
    lose:          () => p(c=>[[392,0],[330,.2],[262,.45]].forEach(([f,t])=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='triangle';o.frequency.value=f;const st=c.currentTime+t;g.gain.setValueAtTime(.2,st);g.gain.exponentialRampToValueAtTime(.001,st+.5);o.start(st);o.stop(st+.5);})),
    roundStart:    () => p(c=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(.25,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.15);o.start();o.stop(c.currentTime+.15);}),
    opponentAlert: () => p(c=>[330,440,330].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='square';o.frequency.value=f;const t=c.currentTime+i*.12;g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.start(t);o.stop(t+.15);})),
  };
})();

// ─────────────────────────────────────────────
// OPPONENT ADVANCED POPUP (big, must dismiss)
// ─────────────────────────────────────────────
function OpponentAdvancedPopup({ data, onDismiss }) {
  if (!data) return null;
  return (
    <div className="opp-popup-overlay">
      <div className="opp-popup-modal">
        <div className="opp-popup-icon">⚡</div>
        <div className="opp-popup-title">OPPONENT ADVANCED!</div>
        <div className="opp-popup-body">
          Your opponent solved the round and is now on
          <span className="opp-popup-round"> Round {data.opponentRoundIndex + 1}</span>
        </div>
        <div className="opp-popup-score">
          Their score: <span className="opp-popup-pts">{data.opponentPoints} pts</span>
        </div>
        <div className="opp-popup-hint">
          ⏱ You lost {PENALTY_SECONDS}s — stay focused and finish your round!
        </div>
        <button className="opp-popup-btn" onClick={onDismiss}>
          BACK TO BATTLE ▶
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LEADERBOARD COMPONENT
// ─────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'wins',         label: '🏆 Wins'         },
  { key: 'total_points', label: '⚡ Total Points'  },
  { key: 'max_streak',   label: '🔥 Best Streak'   },
  { key: 'rounds',       label: '🧠 Rounds Solved' },
];

function formatMs(ms) {
  if (!ms) return '—';
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
  return `${Math.floor(ms/60000)}m ${((ms%60000)/1000).toFixed(0)}s`;
}

function Leaderboard({ socket, onClose, highlightName }) {
  const [rows,    setRows]    = useState([]);
  const [sortBy,  setSortBy]  = useState('wins');
  const [loading, setLoading] = useState(true);

  const load = useCallback((sort) => {
    setLoading(true);
    socket.emit('get-leaderboard', { sortBy: sort });
  }, [socket]);

  useEffect(() => {
    load(sortBy);
    socket.on('leaderboard-data', ({ rows: r }) => { setRows(r); setLoading(false); });
    return () => socket.off('leaderboard-data');
  }, [socket, load, sortBy]);

  const handleSort = (key) => { setSortBy(key); load(key); };

  const medals = ['🥇','🥈','🥉'];

  return (
    <div className="lb-overlay">
      <div className="lb-modal">
        <div className="lb-header">
          <div className="lb-title">🏆 LEADERBOARD</div>
          <button className="lb-close" onClick={onClose}>✕</button>
        </div>

        <div className="lb-sort-row">
          {SORT_OPTIONS.map(o => (
            <button key={o.key}
              className={`lb-sort-btn ${sortBy === o.key ? 'active' : ''}`}
              onClick={() => handleSort(o.key)}>
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="lb-loading">⟳ Loading ranks...</div>
        ) : rows.length === 0 ? (
          <div className="lb-empty">No matches played yet. Be the first!</div>
        ) : (
          <div className="lb-table">
            <div className="lb-row lb-thead">
              <span className="lb-col-rank">#</span>
              <span className="lb-col-name">PLAYER</span>
              <span className="lb-col-stat">W</span>
              <span className="lb-col-stat">L</span>
              <span className="lb-col-stat">PTS</span>
              <span className="lb-col-stat">RNDS</span>
              <span className="lb-col-stat">STREAK</span>
              <span className="lb-col-stat">BEST</span>
            </div>
            {rows.map((row, i) => {
              const isMe = row.name === (highlightName || '').toLowerCase();
              return (
                <div key={row.name} className={`lb-row ${isMe ? 'lb-row-me' : ''} ${i < 3 ? 'lb-row-top' : ''}`}>
                  <span className="lb-col-rank">{medals[i] || i + 1}</span>
                  <span className="lb-col-name">
                    {row.name}
                    {isMe && <span className="lb-you-tag">YOU</span>}
                  </span>
                  <span className="lb-col-stat" style={{color:'var(--neon-green)'}}>{row.wins}</span>
                  <span className="lb-col-stat" style={{color:'var(--neon-pink)'}}>{row.losses}</span>
                  <span className="lb-col-stat" style={{color:'var(--neon-cyan)'}}>{row.total_points}</span>
                  <span className="lb-col-stat">{row.rounds_solved}</span>
                  <span className="lb-col-stat" style={{color:'var(--neon-yellow)'}}>
                    {row.max_streak > 0 ? `🔥${row.max_streak}` : '—'}
                  </span>
                  <span className="lb-col-stat" style={{color:'rgba(136,146,176,0.7)',fontSize:'.72rem'}}>
                    {formatMs(row.best_round_ms)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="lb-footer">Top 10 players · Updates after every match</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOBBY
// ─────────────────────────────────────────────
function LobbyScreen({ onJoinGame, onSpectate, socket }) {
  const [screen, setScreen]         = useState('main');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode]     = useState('');
  const [genCode, setGenCode]       = useState('');
  const [error, setError]           = useState('');
  const [waiting, setWaiting]       = useState(false);
  const [showLB, setShowLB]         = useState(false);

  useEffect(() => {
    socket.on('match-ready', ({ roundSequence, playerNames }) => {
      onJoinGame(roomCode || genCode, playerName || 'Player', roundSequence, playerNames);
    });
    socket.on('spectate-started', ({ playerNames, gameState }) => {
      onSpectate(roomCode.trim().toUpperCase(), playerNames, gameState);
    });
    socket.on('room-error', ({ message }) => { setError(message); setWaiting(false); });
    return () => { socket.off('match-ready'); socket.off('room-error'); socket.off('spectate-started'); };
  }, [playerName, roomCode, genCode, onJoinGame, onSpectate, socket]);

  const handleCreate = () => {
    if (!playerName.trim()) { setError('Enter your name!'); return; }
    const code = generateRoomCode();
    setGenCode(code); setWaiting(true); setError('');
    socket.emit('create-room', { roomCode: code, playerName: playerName.trim() });
  };

  const handleJoin = () => {
    if (!playerName.trim()) { setError('Enter your name!'); return; }
    if (!roomCode.trim())   { setError('Enter a room code!'); return; }
    setError(''); setWaiting(true);
    socket.emit('join-room', { roomCode: roomCode.trim().toUpperCase(), playerName: playerName.trim() });
  };

  const handleSpectate = () => {
    if (!roomCode.trim()) { setError('Enter a room code!'); return; }
    setError(''); setWaiting(true);
    socket.emit('spectate-room', { roomCode: roomCode.trim().toUpperCase() });
  };

  return (
    <div className="lobby-screen">
      {showLB && <Leaderboard socket={socket} onClose={() => setShowLB(false)} highlightName={playerName} />}
      <div className="lobby-logo">CODACLUB</div>
      <div className="lobby-tagline">// competitive bug-fixing arena_</div>
      <div className="lobby-card">
        {screen === 'main' && (<>
          <div className="lobby-card-title">ENTER YOUR NAME</div>
          <input className="lobby-input" placeholder="your_handle" value={playerName}
            onChange={e => { setPlayerName(e.target.value); setError(''); }} maxLength={16} />
          <div style={{height:20}}/>
          <button className="btn-primary" onClick={() => { if (!playerName.trim()){setError('Enter your name!');return;} setScreen('create');setError(''); }}>CREATE ROOM</button>
          <div className="lobby-divider">OR</div>
          <button className="btn-secondary" onClick={() => { if (!playerName.trim()){setError('Enter your name!');return;} setScreen('join');setError(''); }}>JOIN ROOM</button>
          <div className="lobby-divider">OR</div>
          <button className="btn-spectate" onClick={() => setScreen('spectate')}>👁 SPECTATE BATTLE</button>
          <div className="lobby-divider">OR</div>
          <button className="btn-leaderboard" onClick={() => setShowLB(true)}>🏆 LEADERBOARD</button>
          {error && <div className="lobby-error">⚠ {error}</div>}
        </>)}

        {screen === 'create' && !waiting && (<>
          <div className="lobby-card-title">CREATE ROOM</div>
          <p style={{fontFamily:'Share Tech Mono',color:'var(--text-mid)',fontSize:'.85rem',marginBottom:'20px',lineHeight:1.6}}>
            A room code will be generated.<br/>Share it with your opponent.
          </p>
          <button className="btn-primary" onClick={handleCreate}>GENERATE ROOM CODE</button>
          <div style={{height:10}}/>
          <button className="btn-secondary" onClick={() => setScreen('main')}>BACK</button>
          {error && <div className="lobby-error">⚠ {error}</div>}
        </>)}

        {screen === 'create' && waiting && (<>
          <div className="lobby-card-title">WAITING FOR OPPONENT</div>
          <div className="room-code-display">
            <div className="room-code-label">SHARE THIS CODE</div>
            <div className="room-code-value">{genCode}</div>
          </div>
          <div className="waiting-text">⟳ Waiting for player to join...</div>
          {error && <div className="lobby-error">⚠ {error}</div>}
        </>)}

        {screen === 'join' && (<>
          <div className="lobby-card-title">JOIN ROOM</div>
          <input className="lobby-input" placeholder="ROOM CODE" value={roomCode}
            onChange={e => { setRoomCode(e.target.value.toUpperCase());setError(''); }}
            maxLength={6} style={{textAlign:'center',letterSpacing:'.4em',fontSize:'1.2rem'}} />
          {!waiting ? (<>
            <button className="btn-primary" onClick={handleJoin}>JOIN BATTLE</button>
            <div style={{height:10}}/>
            <button className="btn-secondary" onClick={() => setScreen('main')}>BACK</button>
          </>) : <div className="waiting-text">⟳ Connecting...</div>}
          {error && <div className="lobby-error">⚠ {error}</div>}
        </>)}

        {screen === 'spectate' && (<>
          <div className="lobby-card-title">👁 SPECTATE</div>
          <input className="lobby-input" placeholder="ROOM CODE" value={roomCode}
            onChange={e => { setRoomCode(e.target.value.toUpperCase());setError(''); }}
            maxLength={6} style={{textAlign:'center',letterSpacing:'.4em',fontSize:'1.2rem'}} />
          {!waiting ? (<>
            <button className="btn-primary" onClick={handleSpectate}>WATCH LIVE</button>
            <div style={{height:10}}/>
            <button className="btn-secondary" onClick={() => setScreen('main')}>BACK</button>
          </>) : <div className="waiting-text">⟳ Joining as spectator...</div>}
          {error && <div className="lobby-error">⚠ {error}</div>}
        </>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SPECTATOR SCREEN
// ─────────────────────────────────────────────
function SpectatorScreen({ roomCode, playerNames, initialGameState, socket, onLeave }) {
  const [gameState, setGameState] = useState(initialGameState || { players: [{},{}] });
  useEffect(() => {
    SFX.roundStart();
    socket.on('spectate-state-update', ({ gameState: gs }) => setGameState(gs));
    socket.on('opponent-disconnected', onLeave);
    return () => { socket.off('spectate-state-update'); socket.off('opponent-disconnected'); };
  }, [socket, onLeave]);
  const p1 = gameState?.players?.[0] || {};
  const p2 = gameState?.players?.[1] || {};
  return (
    <div className="spectator-screen">
      <div className="spectator-header">
        <div className="game-logo">CODACLUB</div>
        <div className="spectator-badge">👁 SPECTATING — {roomCode}</div>
        <button className="btn-leave-spectate" onClick={onLeave}>LEAVE</button>
      </div>
      <div className="spectator-arena">
        <div className="spectator-player-panel">
          <div className="spec-player-name">{playerNames?.[0]||'P1'} <span className="spec-tag">P1</span></div>
          <div className="spec-points" style={{color:'var(--neon-cyan)'}}>{p1.points??'—'}<span style={{fontSize:'.7rem',opacity:.6}}>pts</span></div>
          <div className="spec-bar-wrap"><div className="spec-bar-fill cyan" style={{width:`${Math.min(((p1.points||0)/WIN_SCORE)*100,100)}%`}}/></div>
          <div className="spec-challenge">
            {p1.challenge ? <><div className="spec-challenge-title">{p1.challenge.title}</div><div className="spec-challenge-desc">{p1.challenge.description}</div></> : <div className="spec-challenge-title" style={{opacity:.4}}>Waiting...</div>}
          </div>
          {p1.timeLeft != null && <div className="spec-time">⏱ {formatTime(p1.timeLeft)}</div>}
        </div>
        <div className="spectator-vs">
          <div className="spec-vs-label">VS</div>
          <div className="spec-win-target">🏁 First to {WIN_SCORE}pts</div>
        </div>
        <div className="spectator-player-panel">
          <div className="spec-player-name">{playerNames?.[1]||'P2'} <span className="spec-tag pink">P2</span></div>
          <div className="spec-points" style={{color:'var(--neon-pink)'}}>{p2.points??'—'}<span style={{fontSize:'.7rem',opacity:.6}}>pts</span></div>
          <div className="spec-bar-wrap"><div className="spec-bar-fill pink" style={{width:`${Math.min(((p2.points||0)/WIN_SCORE)*100,100)}%`}}/></div>
          <div className="spec-challenge">
            {p2.challenge ? <><div className="spec-challenge-title">{p2.challenge.title}</div><div className="spec-challenge-desc">{p2.challenge.description}</div></> : <div className="spec-challenge-title" style={{opacity:.4}}>Waiting...</div>}
          </div>
          {p2.timeLeft != null && <div className="spec-time">⏱ {formatTime(p2.timeLeft)}</div>}
        </div>
      </div>
      <div className="spectator-footer">Live updates on every solve</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GAME SCREEN
// ─────────────────────────────────────────────
function GameScreen({ roomCode, playerName, roundSequence, socket, onPlayAgain }) {

  // ── Each player independently moves through the shared sequence ──
  const [myRoundIndex,       setMyRoundIndex]       = useState(0);
  const [opponentRoundIndex, setOpponentRoundIndex] = useState(0);

  // Derive challenge + language from the shared sequence
  const currentRoundData = roundSequence[Math.min(myRoundIndex, roundSequence.length - 1)];
  const challenge = CHALLENGES.find(c => c.id === currentRoundData.challengeId) || CHALLENGES[0];
  const language  = currentRoundData.language;
  const langMeta  = LANGUAGE_META[language] || LANGUAGE_META.javascript;

  const [attack,              setAttack]              = useState('');
  const [points,              setPoints]              = useState(STARTING_POINTS);
  const [opponentPoints,      setOpponentPoints]      = useState(STARTING_POINTS);
  const [matchStatus,         setMatchStatus]         = useState('playing');
  const [toast,               setToast]               = useState(null);
  const [attackNotif,         setAttackNotif]         = useState(null);
  const [pointsGain,          setPointsGain]          = useState(null);
  const [oppAdvancedData,     setOppAdvancedData]     = useState(null); // big popup
  const [bonusFlash,          setBonusFlash]          = useState(false);
  const [penaltyFlash,        setPenaltyFlash]        = useState(false);
  const [showLeaderboard,     setShowLeaderboard]     = useState(false);

  const [timeLeft,  setTimeLeft]  = useState(MATCH_DURATION);
  const timeRef        = useRef(MATCH_DURATION);
  const timerRef       = useRef(null);
  const matchStatusRef = useRef('playing');
  const editorRef      = useRef(null);
  const editorKeyRef   = useRef(0);
  const roundStartRef  = useRef(Date.now()); // track when current round started

  useEffect(() => { matchStatusRef.current = matchStatus; }, [matchStatus]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (matchStatusRef.current !== 'playing') { clearInterval(timerRef.current); return; }
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        clearInterval(timerRef.current);
        setMatchStatus('time-up');
        socket.emit('time-up', { roomCode, myPoints: points, opponentPoints });
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBonusTime = useCallback(() => {
    timeRef.current = Math.min(timeRef.current + BONUS_SECONDS, MATCH_DURATION);
    setTimeLeft(timeRef.current);
    setBonusFlash(true); setTimeout(() => setBonusFlash(false), 1200);
    SFX.bonusTime();
  }, []);

  const applyTimePenalty = useCallback(() => {
    timeRef.current = Math.max(timeRef.current - PENALTY_SECONDS, 0);
    setTimeLeft(timeRef.current);
    setPenaltyFlash(true); setTimeout(() => setPenaltyFlash(false), 1400);
    SFX.penaltyTime();
  }, []);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const syncState = useCallback((pts, chal) => {
    socket.emit('my-points-update', {
      roomCode, points: pts, playerName,
      challenge: chal ? { title: chal.title, description: chal.description } : null,
      timeLeft: timeRef.current,
    });
  }, [socket, roomCode, playerName]);

  // Socket events
  useEffect(() => {
    socket.on('receive-attack', ({ type }) => {
      setAttack(type); setAttackNotif(type);
      setTimeout(() => setAttack(''), 5000);
      setTimeout(() => setAttackNotif(null), 3000);
      SFX.glitch();
    });

    // ── OPPONENT SOLVED — they moved to next round, you stay put ──
    socket.on('opponent-advanced', ({ opponentPoints: op, opponentRoundIndex: oppIdx }) => {
      setOpponentPoints(op);
      setOpponentRoundIndex(oppIdx);
      if (op >= WIN_SCORE) {
        clearInterval(timerRef.current);
        setMatchStatus('match-lost');
        SFX.lose();
      } else {
        // Play alert sound + show big popup + apply -10s
        SFX.opponentAlert();
        applyTimePenalty();
        setOppAdvancedData({ opponentPoints: op, opponentRoundIndex: oppIdx });
      }
    });

    socket.on('opponent-points-update', ({ points: op }) => setOpponentPoints(op));
    socket.on('match-over',    ()  => { clearInterval(timerRef.current); setMatchStatus('match-lost'); SFX.lose(); });
    socket.on('opponent-time-up', () => { clearInterval(timerRef.current); setMatchStatus('time-up'); });
    socket.on('opponent-disconnected', () => {
      clearInterval(timerRef.current);
      showToast('win', 'Opponent disconnected. You win!');
      setTimeout(() => setMatchStatus('match-won'), 2000);
      SFX.win();
    });

    return () => {
      socket.off('receive-attack');
      socket.off('opponent-advanced');
      socket.off('opponent-points-update');
      socket.off('match-over');
      socket.off('opponent-time-up');
      socket.off('opponent-disconnected');
    };
  }, [socket, applyTimePenalty, showToast]);

  const handleEditorMount = (editor) => { editorRef.current = editor; };

  const sendAttack = (type, cost) => {
    if (matchStatus !== 'playing' || points < cost) return;
    const np = points - cost;
    setPoints(np);
    socket.emit('send-attack', { type, roomCode });
    syncState(np, challenge);
  };

  const checkSolution = () => {
    if (!editorRef.current || matchStatus !== 'playing') return;
    const code   = editorRef.current.getValue();
    const passed = runTests(code, challenge, language);

    if (!passed) {
      alert(`❌ Tests failing — keep at it! Check your ${langMeta.label} fix.`);
      return;
    }

    const gained    = challenge.points;
    const np        = points + gained;
    const nextIndex = myRoundIndex + 1;

    setPoints(np);
    setPointsGain(`+${gained}`);
    setTimeout(() => setPointsGain(null), 1500);
    addBonusTime();
    SFX.solve();

    // Tell server: this player solved and is advancing (include round solve time)
    const roundMs = Date.now() - roundStartRef.current;
    socket.emit('round-solved', { roomCode, points: np, newRoundIndex: nextIndex, roundMs });

    if (np >= WIN_SCORE) {
      clearInterval(timerRef.current);
      socket.emit('match-won', { roomCode, winnerPoints: np });
      setMatchStatus('match-won');
      SFX.win();
      return;
    }

    if (nextIndex >= roundSequence.length) {
      // All rounds done — just keep accumulating points
      showToast('win', `+${gained}pts! All ${roundSequence.length} rounds complete — hold your lead!`);
      syncState(np, null);
    } else {
      // Move to next round in the shared sequence
      const nextRoundData = roundSequence[nextIndex];
      const nextChallenge = CHALLENGES.find(c => c.id === nextRoundData.challengeId) || CHALLENGES[0];
      showToast('win', `+${gained}pts! +${BONUS_SECONDS}s → Round ${nextIndex + 1}: ${nextChallenge.title}`);
      syncState(np, nextChallenge);

      // Advance round after toast
      setTimeout(() => {
        setMyRoundIndex(nextIndex);
        editorKeyRef.current += 1;
        roundStartRef.current = Date.now(); // reset round timer
        SFX.roundStart();
      }, 2000);
    }
  };

  const timerDanger  = timeLeft <= 30;
  const timerWarning = timeLeft > 30 && timeLeft <= 60;
  const currentVariant = challenge.variants[language] || challenge.variants.javascript;
  const attackInfo   = ATTACKS.find(a => a.type === attackNotif);

  return (
    <div className={`App ${attack}`}>

      {/* ── BIG OPPONENT ADVANCED POPUP ── */}
      <OpponentAdvancedPopup data={oppAdvancedData} onDismiss={() => setOppAdvancedData(null)} />

      {/* HEADER */}
      <div className="game-header">
        <div className="game-logo">CODACLUB</div>
        <div className={`timer-display${timerDanger?' danger':timerWarning?' warning':''}${bonusFlash?' bonus-flash':''}${penaltyFlash?' penalty-flash':''}`}>
          <span className="timer-icon">{timerDanger?'🔴':timerWarning?'🟡':'⏱'}</span>
          <span className="timer-value">{formatTime(timeLeft)}</span>
          {bonusFlash   && <span className="timer-bonus">+{BONUS_SECONDS}s!</span>}
          {penaltyFlash && <span className="timer-penalty">-{PENALTY_SECONDS}s!</span>}
        </div>
        <div className="game-room-info">
          ROOM: <span>{roomCode}</span> &nbsp;|&nbsp;
          {playerName} &nbsp;|&nbsp;
          You: Rd <span style={{color:'var(--neon-cyan)'}}>{myRoundIndex + 1}</span> &nbsp;|&nbsp;
          Opp: Rd <span style={{color:'var(--neon-pink)'}}>{opponentRoundIndex + 1}</span>
        </div>
      </div>

      {/* SCOREBOARD */}
      <div className="points-bar">
        <div className="score-block">
          <div className="score-name">{playerName} <span style={{color:'var(--neon-cyan)'}}>(YOU)</span></div>
          <div className="score-pts you">{points}<span>pts</span></div>
          <div className="score-bar-wrap"><div className="score-bar-fill" style={{width:`${Math.min((points/WIN_SCORE)*100,100)}%`,background:'var(--neon-cyan)'}}/></div>
        </div>
        <div className="score-vs">VS</div>
        <div className="score-block">
          <div className="score-name">OPPONENT</div>
          <div className="score-pts opp">{opponentPoints}<span>pts</span></div>
          <div className="score-bar-wrap"><div className="score-bar-fill" style={{width:`${Math.min((opponentPoints/WIN_SCORE)*100,100)}%`,background:'var(--neon-pink)'}}/></div>
        </div>
        <div className="win-target">
          🏁 First to {WIN_SCORE}pts wins<br/>
          Solve → +{BONUS_SECONDS}s you / −{PENALTY_SECONDS}s them
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="game-main">
        <div className="challenge-panel">
          <div className="challenge-header">
            <span className="challenge-tag">
              ROUND {myRoundIndex + 1} of {roundSequence.length}
              {opponentRoundIndex > myRoundIndex && (
                <span style={{color:'var(--neon-pink)',marginLeft:'12px'}}>
                  ⚠ Opp is on Rd {opponentRoundIndex + 1}
                </span>
              )}
            </span>
            <span className="challenge-number">+{challenge.points} pts on solve</span>
          </div>
          <div className="challenge-title">{challenge.title}</div>
          <div className="challenge-desc">{challenge.description}</div>
        </div>

        <div className="editor-panel">
          <div className="editor-topbar">
            <div className="editor-dots"><span/><span/><span/></div>
            <div className="language-badge">
              <span className="language-badge-icon">{langMeta.icon}</span>
              <span className="language-badge-label">{langMeta.label}</span>
            </div>
            <div className="editor-lang">{langMeta.label}</div>
          </div>
          <div className="editor-wrapper">
            <Editor
              key={editorKeyRef.current}
              height="36vh"
              theme="vs-dark"
              language={langMeta.monacoLang}
              defaultValue={currentVariant?.starterCode || '// no variant found'}
              onMount={handleEditorMount}
              options={{ fontSize: 15, minimap: { enabled: false }, fontFamily: "'Share Tech Mono', monospace" }}
            />
          </div>
        </div>

        <div className="action-row">
          <div className="attacks-panel">
            <div className="attacks-title">⚡ ATTACKS</div>
            <div className="attacks-grid">
              {ATTACKS.map(atk => (
                <button key={atk.type}
                  className={`attack-btn ${points < atk.cost ? 'cant-afford' : ''}`}
                  onClick={() => sendAttack(atk.type, atk.cost)}
                  disabled={matchStatus !== 'playing' || points < atk.cost}>
                  <span className="attack-icon">{atk.icon}</span>
                  <span className="attack-name">{atk.name}</span>
                  <span className="attack-cost">{atk.cost}pts</span>
                </button>
              ))}
            </div>
          </div>
          <div className="submit-panel">
            <button className="btn-submit" onClick={checkSolution} disabled={matchStatus !== 'playing'}>SUBMIT ✓</button>
            <div className={`status-text ${attack ? 'under-attack' : ''}`}>
              {attack ? `⚠ ${attack.replace('-mode','').toUpperCase()} ATTACK!` : '● solving...'}
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`round-toast ${toast.type}`}>
          <div className="round-toast-icon">{toast.type === 'win' ? '✅' : '💀'}</div>
          <div>
            <div className="round-toast-title">{toast.type === 'win' ? 'ROUND SOLVED!' : 'NOTICE'}</div>
            <div className="round-toast-sub">{toast.message}</div>
          </div>
        </div>
      )}

      {/* ATTACK NOTIFICATION */}
      {attackNotif && (
        <div className="attack-notification">
          <span className="attack-notification-icon">{attackInfo?.icon || '⚡'}</span>
          <span className="attack-notification-text">{attackNotif.replace('-mode','').toUpperCase()} ATTACK!</span>
        </div>
      )}

      {/* POINTS GAIN */}
      {pointsGain && <div className="points-gained">{pointsGain}</div>}

      {/* END SCREENS */}
      {matchStatus === 'match-won' && (
        <div className="overlay win">
          {showLeaderboard && <Leaderboard socket={socket} onClose={() => setShowLeaderboard(false)} highlightName={playerName} />}
          <div className="overlay-title">CHAMPION!</div>
          <div className="overlay-sub">you reached {WIN_SCORE} points first</div>
          <div className="overlay-score">🏆 {points} pts</div>
          <div className="overlay-btn-row">
            <button className="btn-play-again" onClick={onPlayAgain}>PLAY AGAIN</button>
            <button className="btn-lb-end" onClick={() => setShowLeaderboard(true)}>🏆 LEADERBOARD</button>
          </div>
        </div>
      )}
      {matchStatus === 'match-lost' && (
        <div className="overlay lose">
          {showLeaderboard && <Leaderboard socket={socket} onClose={() => setShowLeaderboard(false)} highlightName={playerName} />}
          <div className="overlay-title">DEFEATED</div>
          <div className="overlay-sub">opponent reached {WIN_SCORE} points first</div>
          <div className="overlay-score">💀 {points} pts</div>
          <div className="overlay-btn-row">
            <button className="btn-play-again" onClick={onPlayAgain}>REMATCH</button>
            <button className="btn-lb-end" onClick={() => setShowLeaderboard(true)}>🏆 LEADERBOARD</button>
          </div>
        </div>
      )}
      {matchStatus === 'time-up' && (
        <div className={`overlay ${points >= opponentPoints ? 'win' : 'lose'}`}>
          {showLeaderboard && <Leaderboard socket={socket} onClose={() => setShowLeaderboard(false)} highlightName={playerName} />}
          <div className="overlay-title">
            {points > opponentPoints ? 'TIME WINNER!' : points === opponentPoints ? "DRAW!" : 'TIME UP!'}
          </div>
          <div className="overlay-sub">
            {points > opponentPoints ? 'More points when time expired!'
              : points === opponentPoints ? 'Tied on points!'
              : 'Opponent had more points!'}
          </div>
          <div className="overlay-score">You: {points}pts | Opponent: {opponentPoints}pts</div>
          <div className="overlay-btn-row">
            <button className="btn-play-again" onClick={onPlayAgain}>PLAY AGAIN</button>
            <button className="btn-lb-end" onClick={() => setShowLeaderboard(true)}>🏆 LEADERBOARD</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
const getSocket = (() => {
  let s = null;
  return () => {
    if (!s) s = io('https://mushily-tempting-anneliese.ngrok-free.dev', {
      transportOptions: { polling: { extraHeaders: { 'ngrok-skip-browser-warning': 'true' } } }
    });
    return s;
  };
})();

function App() {
  const [screen,        setScreen]        = useState('lobby');
  const [roomCode,      setRoomCode]      = useState('');
  const [playerName,    setPlayerName]    = useState('');
  const [roundSequence, setRoundSequence] = useState([]);
  const [spectatorData, setSpectatorData] = useState(null);
  const sock = getSocket();

  const handleJoinGame = (code, name, seq) => {
    setRoomCode(code); setPlayerName(name); setRoundSequence(seq); setScreen('game');
  };
  const handleSpectate = (code, playerNames, gameState) => {
    setRoomCode(code); setSpectatorData({ playerNames, gameState }); setScreen('spectate');
  };

  if (screen === 'spectate' && spectatorData) {
    return <SpectatorScreen roomCode={roomCode} playerNames={spectatorData.playerNames}
      initialGameState={spectatorData.gameState} socket={sock} onLeave={() => setScreen('lobby')} />;
  }

  return screen === 'lobby'
    ? <LobbyScreen onJoinGame={handleJoinGame} onSpectate={handleSpectate} socket={sock} />
    : <GameScreen roomCode={roomCode} playerName={playerName} roundSequence={roundSequence}
        socket={sock} onPlayAgain={() => setScreen('lobby')} />;
}

export default App;