export const formatUTCDate = (utc: number) => {
  const date = new Date(utc);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}.${month}.${day} ${String(hours).padStart(2, "0")}:${minutes}`;
};
