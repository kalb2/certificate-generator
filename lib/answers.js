function flattenAnswers(items, output = []) {
  for (const answer of items || []) {
    if (!answer || typeof answer !== 'object') continue;
    if (answer.questionId) output.push(answer);
    if (Array.isArray(answer.answers)) flattenAnswers(answer.answers, output);
    if (Array.isArray(answer.groupAnswers)) {
      for (const group of answer.groupAnswers) flattenAnswers(group.answers || group, output);
    }
  }
  return output;
}

export function answerById(answers, id) {
  if (!id) return null;
  return flattenAnswers(answers).find((a) => String(a.questionId) === String(id)) || null;
}

export function answerValue(answer) {
  if (!answer) return '';
  if (answer.value != null) return String(answer.value);
  if (answer.inputValue != null) return String(answer.inputValue);
  if (answer.timestamp != null) return new Date(Number(answer.timestamp) * 1000).toLocaleDateString('en-US');
  if (answer.selectedAnswers?.length) return answer.selectedAnswers.map((a) => a.text ?? a.value ?? '').filter(Boolean).join(', ');
  if (answer.ratingValue != null) return String(answer.ratingValue);
  if (answer.result != null) return String(answer.result);
  return '';
}

export function signatureUrl(answer) {
  if (!answer) return '';
  const candidates = [
    answer.images?.[0]?.url,
    answer.images?.[0]?.imageUrl,
    answer.image?.url,
    answer.imageUrl,
    answer.signature?.url,
    answer.fileUrl,
    answer.value
  ];
  return candidates.find((value) => typeof value === 'string' && /^https?:\/\//i.test(value)) || '';
}
