// src/utils/survey.js
export function stripCorrectAnswers(questionnaire) {
  // Deep copy then remove keys like `correctAnswer`, `correctAnswers`, `rightAnswer`, `score`
  try {
    const copy = JSON.parse(JSON.stringify(questionnaire));

    function walk(node) {
      if (Array.isArray(node)) {
        node.forEach(walk);
      } else if (node && typeof node === "object") {
        // remove grading keys on question objects
        delete node.correctAnswer;
        delete node.correctAnswers;
        delete node.score;
        delete node.rightAnswer;
        // walk children
        Object.keys(node).forEach((k) => walk(node[k]));
      }
    }

    walk(copy);
    return copy;
  } catch (e) {
    console.warn("stripCorrectAnswers failed", e);
    return questionnaire;
  }
}
