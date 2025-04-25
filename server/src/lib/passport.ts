import { Router } from 'express'
import passport, { type DoneCallback } from 'passport'
import { Strategy as GitHubStrategy, Profile } from 'passport-github2'
import { getEnv } from './env'
import { findOrCreateUser } from '../queries/users.queries'
import { getPgClient } from './db'
export const setupPassport = (app: Router) => {
  app.use(passport.initialize())
  passport.serializeUser(function (user, done) {
    done(null, user)
  })

  passport.deserializeUser(function (user: any, done) {
    done(null, user)
  })

  passport.use(
    new GitHubStrategy(
      {
        clientID: getEnv().GITHUB_CLIENT_ID,
        clientSecret: getEnv().GITHUB_CLIENT_SECRET,
        callbackURL: getEnv().FRONTEND_URL + '/api/auth/github/callback',
        scope: ['user:email'],
      },
      // According to some doc I found, this access token lasts forever, or until
      // it has gone unused for a year. If this were a real product, i would
      // be more suspicious of that, but for now, i don't care to deal with the
      // refresh token shenanigans (which is undefined)
      async function (accessToken: string, _refreshToken: string, profile: Profile, cb: DoneCallback) {
        const client = await getPgClient()
        // username probably isn't a great thing to key off of, I don't know if
        // it can be changed or whatever, but good enough for this demo project
        let userName = profile?.username
        if (!userName) return cb(new Error('No username returned'))
        let avatar = profile.photos?.[0].value ?? 'https://avatars.tzador.com/face?id=' + encodeURIComponent(userName)
        let displayName = profile.displayName ?? userName
        // another assumption, that 0 is the primary email 🤷‍♂️
        let email = profile.emails?.[0].value
        if (!email) {
          return cb(new Error('No Email Provided'))
        }
        try {
          // in a production system this would not be sufficient security
          // access_key should be encrypted with a public key, and in another
          // table where the main service only has write access, and the worker
          // service only has read access but does have the private key.
          let result = await findOrCreateUser.run(
            {
              access_key: accessToken,
              github_username: userName,
              github_avatar: avatar,
              github_displayname: displayName,
              email,
            },
            client
          )
          let user: Partial<(typeof result)[number]> = result[0]
          if (!user) {
            // This should always return a row, because it creates a user if it's
            // not found
            console.warn('User not found fom findOrCreate')
            cb(new Error('Unknown Error'))
          }
          // don't store the access key on the session, look it up every time
          if (user.access_key) {
            delete user.access_key
          }
          return cb(null, user)
        } catch (err: any) {
          return cb(err, false)
        } finally {
          client.release()
        }
      }
    )
  )
  app.get('/api/auth/github', passport.authenticate('github'))

  app.get(
    '/api/auth/github/callback',
    // failure redirect is not working correctly, but thats a problem for a
    // a real project.
    passport.authenticate('github', { failureRedirect: '/?error=authentication_failed' }),
    function (req, res) {
      // Successful authentication, redirect home.
      res.redirect('/')
    }
  )
  app.post('/api/logout', function (req, res, next) {
    req.logout(function (err) {
      if (err) {
        return next(err)
      }
      res.json({
        message: 'Successfully logged out',
      })
      next()
    })
  })
  return app
}
