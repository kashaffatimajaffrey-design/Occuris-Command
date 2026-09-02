// Dev harness only. Returns a canned answer that deliberately cites [5] and
// [6] (which exist) and [9] (which does not), so both the resolved and the
// unresolved rendering paths can be seen. The real model round-trip is
// verified separately over HTTP.
export async function sendMessage() {
  return {
    text:
      'Fabrication was completed [5] and the order was dispatched shortly after [6]. ' +
      'The truck also had a transmission failure on the way [9].',
    provider: 'ollama',
    model: 'llama3.1:8b',
    degraded: false,
    primary_error: null,
  };
}
