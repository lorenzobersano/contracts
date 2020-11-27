module.exports.waitForEvent = (_event, _from = 0) =>
  new Promise((resolve, reject) =>
    _event({ fromBlock: _from }, (e, ev) => (e ? reject(e) : resolve(ev)))
  );
