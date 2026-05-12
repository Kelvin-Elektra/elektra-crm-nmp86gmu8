routerAdd('POST', '/backend/v1/sso-login', (e) => {
  const body = e.requestInfo().body
  const token = body.token
  if (!token) {
    return e.badRequestError('Token is required')
  }

  const ssoSecret = $secrets.get('SSO_SECRET') || ''

  const res = $http.send({
    url: 'https://master-hub-admin-cd135.shrd00.internal.goskip.dev/api/backend/v1/sso-verify',
    method: 'POST',
    body: JSON.stringify({ token: token }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: ssoSecret ? 'Bearer ' + ssoSecret : '',
    },
    timeout: 15,
  })

  if (res.statusCode !== 200) {
    $app
      .logger()
      .error(
        'SSO token verification failed',
        'status',
        res.statusCode,
        'response',
        JSON.stringify(res.json || {}),
      )
    return e.badRequestError('Invalid or expired SSO token')
  }

  const ssoData = res.json || {}
  const userData = ssoData.user || (ssoData.data && ssoData.data.user) || ssoData
  const email = userData.email

  if (!email) {
    $app.logger().error('SSO response missing email', 'data', JSON.stringify(ssoData))
    return e.badRequestError('SSO response missing email')
  }

  let userRecord
  try {
    userRecord = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    const col = $app.findCollectionByNameOrId('users')
    userRecord = new Record(col)
    userRecord.setEmail(email)
    userRecord.setPassword($security.randomString(20))
    userRecord.setVerified(true)
    userRecord.set('status', 'active')
  }

  if (userData.name) userRecord.set('name', userData.name)
  if (userData.role) userRecord.set('role', userData.role)
  if (userData.company_id) userRecord.set('company_id', userData.company_id)
  if (typeof userData.is_owner !== 'undefined') {
    userRecord.set('is_owner', userData.is_owner === true || userData.is_owner === 'true')
  }

  try {
    $app.save(userRecord)
  } catch (err) {
    $app.logger().error('SSO save failed', 'error', err.message, 'email', email)
    return e.internalServerError('Failed to save user record during SSO.')
  }

  return $apis.recordAuthResponse($app, e, userRecord)
})
