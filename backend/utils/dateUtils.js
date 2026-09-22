export const getLocalDateString = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalDateStringAfterDays = (days) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return getLocalDateString(value);
};
