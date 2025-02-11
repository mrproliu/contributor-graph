export const getMonths = (month = 12) => {
  const d = new Date();
  const result = [];
  for (let i = 0; i < month; i++) {
    d.setMonth(d.getMonth() - 1);
    const m = d.getMonth() + 1;
    const month = m < 10 ? `0${m}` : m;
    result.push(`${d.getFullYear()}-${month}`);
  }
  return result.sort();
};

export const getParameterByName = (name, url = window.location.href) => {
  // eslint-disable-next-line
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};

export const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const inIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};
