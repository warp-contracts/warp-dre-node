module.exports = async (ctx) => {
  try {
    throw new Error("not implemented yet");
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
