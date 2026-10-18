export function unauthorized(): Response {
  return Response.json(
    { error: 'Hindsight did not accept the sync token.' },
    { status: 401 },
  )
}
