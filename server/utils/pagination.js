function getPagination(query, defaultLimit = 50) {
  const limit = Math.min(100, parseInt(query.limit, 10) || defaultLimit);
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

module.exports = getPagination;
