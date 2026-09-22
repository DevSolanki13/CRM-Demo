/**
 * Async handler wrapper to forward any unhandled promise rejections to Express next()
 * Eliminates repetitive try/catch blocks across controller functions.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
