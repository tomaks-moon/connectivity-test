export const toString = (data) => {
  return (
    data && data.reduce((acc, curr) => acc + String.fromCharCode(curr), "")
  );
};
