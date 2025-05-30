export const formatUTCDate = (utc: number) => {
  const date = new Date(utc);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}.${month}.${day} ${String(hours).padStart(2, "0")}:${minutes}`;
};
export const formatDuration = (seconds: number | bigint | undefined): string => {
  if (seconds === undefined) {
    return "";
  }
  const secondsNumber = Number(seconds);
  const days = Math.floor(secondsNumber / (24 * 60 * 60));
  const hours = Math.floor((secondsNumber % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((secondsNumber % (60 * 60)) / 60);

  const parts: string[] = [];
  if (days > 0) {
    const unit = days > 1 ? "days" : "day";
    parts.push(`${days} ${unit}`);
  }
  if (hours > 0) {
    const unit = hours > 1 ? "hours" : "hour";
    parts.push(`${hours} ${unit}`);
  }
  if (minutes > 0) {
    const unit = minutes > 1 ? "minutes" : "minute";
    parts.push(`${minutes} ${unit}`);
  }
  if (parts.length === 0) {
    return secondsNumber.toString() + " seconds";
  }
  return parts.join(" ");
};
