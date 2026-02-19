function formatOperation(op) {
  return {
    ...op,
    formattedSequence: `[${op.sequence}]`,
    formattedDescription: `[${op.sequence}] ${op.resourceId || ""} - ${
      op.operationType || "No Type"
    }`.trim(),
    formattedHours: `S/U ${(op.setupHrs || 0).toFixed(2)} Hrs, ${(
      op.runHrs || 0
    ).toFixed(2)} ${op.runType || "HRS/PC"}`,
  };
}

module.exports = { formatOperation };
