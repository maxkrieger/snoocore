/* global describe, it, beforeEach */

var when = require('when');
var delay = require('when/delay');

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;

var Snoocore = require('../../Snoocore');
var config = require('../config');
var tsi = require('./testServerInstance');
var util = require('./util');

describe('Snoocore OAuth Test', function () {

  this.timeout(config.testTimeout);

  describe('Unauthenticated test cases', function() {

    it('application only oauth calling a user specific endpoint should fail', function() {
      var reddit = util.getScriptInstance();
      return reddit('/api/v1/me').get().then(function(data) {
        throw new Error('should not pass, expect to fail with error');
      }).catch(function(error) {
        return expect(error.message).to.eql(
          'Must be authenticated with a user to make a call to this endpoint.');
      });
    });

  });

  describe('Explicit internal configuration (duration permanent)', function() {

    it('should auth, get refresh token, deauth, use refresh token to reauth, deauth(true) -> refresh', function() {

      var reddit = util.getExplicitInstance([ 'identity' ], 'permanent');

      var url = reddit.getExplicitAuthUrl();

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        var authorizationCode = params.code;
        return reddit.auth(authorizationCode).then(function(refreshToken) {

          return reddit('/api/v1/me').get().then(function(data) {

            expect(data.name).to.be.a('string');

            // deauthenticae with the current access token (e.g. "logoff")
            return reddit.deauth().then(function() {
              // get a new access token / re-authenticating by refreshing
              // the given refresh token
              return reddit.refresh(refreshToken);
            });
          }).then(function() {
            expect(reddit._authenticatedAuthData.access_token).to.be.a('string');
            // deauthenticae by removing the refresh token
            return reddit.deauth(refreshToken).then(function() {
              // does NOT automatically get a net access token as we have
              // removed it entirely
              return expect(reddit('/api/v1/me').get()).to.eventually.be.rejected;
            });
          }).then(function() {
            // try to re-authenticate & get a new access token with the
            // revoked refresh token and see that it fails
            return expect(reddit.refresh(refreshToken)).to.eventually.be.rejected;
          });
        });
      });
    });

    it('should auth, deauth (simulate expired access_token), call endpoint which will request a new access_token', function() {

      var reddit = util.getExplicitInstance([ 'identity' ], 'permanent');

      var url = reddit.getExplicitAuthUrl();

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        var authorizationCode = params.code;
        return reddit.auth(authorizationCode).then(function(refreshToken) {

          return reddit('/api/v1/me').get().then(function(data) {
            expect(data.name).to.be.a('string');
            // invalidate the current access token (as if it expired)
            reddit._authenticatedAuthData.access_token = 'invalidToken';
          }).then(function() {
            // by calling this, it will automatically request a new refresh token
            // if the one we were using has expired. The call will take a bit
            // longer to complete as it requests a new access_token first
            return reddit('/api/v1/me').get();
          }).then(function(data) {
            expect(data.name).to.be.a('string');
          }).then(function() {
            // deauthenticae by removing the refresh token
            return reddit.deauth(refreshToken).then(function() {
              return expect(reddit('/api/v1/me').get()).to.eventually.be.rejected;
            });
          }).then(function() {
            // try to re-authenticate & get a new access token with the
            // revoked refresh token and see that it fails
            return expect(reddit.refresh(refreshToken)).to.eventually.be.rejected;
          });
        });
      });
    });


    it('auth (script), expire access token (simulated), then reauth', function() {
      var reddit = util.getScriptInstance([ 'identity' ]);
      var authTokenA;
      var authTokenB;

      return reddit.auth().then(function() {
        return reddit('/api/v1/me').get();
      }).then(function(data) {
        expect(data.name).to.be.a('string');
        authTokenA = reddit._authenticatedAuthData.access_token;
        // "timeout" - simulate expired access token
        reddit._authenticatedAuthData.access_token = 'invalidToken';
      }).then(function() {
        return reddit('/api/v1/me').get();
      }).then(function(data) {
        expect(data.name).to.be.a('string');
        authTokenB = reddit._authenticatedAuthData.access_token;
        expect(authTokenA === authTokenB).to.equal(false);
      });
    });

    it('should auth (script), deauth, and not reauth', function() {
      var reddit = util.getScriptInstance([ 'identity' ]);

      return reddit.auth().then(function() {
        return reddit('/api/v1/me').get();
      }).then(function(data) {
        expect(data.name).to.be.a('string');
        return reddit.deauth();
      }).then(function() {
        return reddit('/api/v1/me').get();
      }).catch(function(error) {
        return expect(error.message).to.eql(
          'Must be authenticated with a user to make a call to this endpoint.');
      });
    });

  });

  describe('Explicit internal configuration (duration temporary)', function() {


    it('should auth, and call an oauth endpoint', function() {

      var reddit = util.getExplicitInstance([ 'identity' ]);

      var url = reddit.getExplicitAuthUrl();

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        var authorizationCode = params.code;
        return reddit.auth(authorizationCode).then(function() {
          return reddit('/api/v1/me').get();
        }).then(function(data) {
          expect(data.error).to.be.undefined;
          expect(data.name).to.be.a('string');
        });
      });
    });

    it('should auth, and call an oauth endpoint (check state)', function() {

      var reddit = util.getExplicitInstance([ 'identity' ]);
      var state = 'foobar';
      var url = reddit.getExplicitAuthUrl(state);

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {

        expect(params.state).to.equal(state);

        var authorizationCode = params.code;
        return reddit.auth(authorizationCode).then(function() {
          return reddit('/api/v1/me').get();
        }).then(function(data) {
          expect(data.error).to.be.undefined;
          expect(data.name).to.be.a('string');
        });
      });
    });

  });

  describe('Implicit internal configuration', function() {

    it('should auth, and call an oauth endpoint', function() {

      var reddit = util.getImplicitInstance([ 'identity' ]);

      var state = 'foobar';
      var url = reddit.getImplicitAuthUrl(state);

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {

        expect(params.state).to.equal(state);

        var accessToken = params['access_token'];

        return reddit.auth(accessToken).then(function() {
          return reddit('/api/v1/me').get();
        }).then(function(data) {
          expect(data.error).to.be.undefined;
          expect(data.name).to.be.a('string');
          // "expire" the access token
          reddit._authenticatedAuthData.access_token = 'invalid_token';

          return when.promise(function(resolve, reject) {

            var i = 2;

            reddit.on('auth_token_expired', function() {
              --i; if (i === 0) { resolve(); }
            });

            reddit('/api/v1/me').get().done(function() {
              reject(); // should have failed, reject this promise if it didn't
            }, function(error) {
              --i; if (i === 0) { return resolve(); }
              expect(error.message).to.equal(
                'Access token has expired. ' +
                'Listen for the "access_token_expired" event to ' +
                'handle this gracefully in your app.');
              resolve();
            });


          });
        });
      });

    });

  });

  describe('Script internal configuration Authenticate tests', function() {

    it('should authenticate with OAuth, and call an oauth endpoint', function() {

      var reddit = util.getScriptInstance();

      return reddit.auth().then(reddit('/api/v1/me').get).then(function(data) {
        expect(data.error).to.be.undefined;
        expect(data.name).to.be.a('string');
      });
    });
  });

  describe('Application only OAuth', function() {

    it('(implicit client) Application only OAuth', function() {
      var reddit = util.getImplicitInstance([ 'read' ]);

      // OAuth only endpoint.
      return reddit('/api/v1/user/$username/trophies').get({
        $username: 'tsenior'
      }).then(function(result) {
        expect(result.kind).to.equal('TrophyList');
      });
    });

    it('(explicit/script client) Application only OAuth', function() {
      var reddit = util.getScriptInstance([ 'read' ]);

      // OAuth only endpoint.
      return reddit('/api/v1/user/$username/trophies').get({
        $username: 'tsenior'
      }).then(function(result) {
        expect(result.kind).to.equal('TrophyList');
      });
    });

  });

  describe('General Reddit API Tests using OAuth', function() {

    it('should get resources when logged in', function() {

      var reddit = util.getScriptInstance([ 'identity', 'mysubreddits' ]);

      return reddit.auth()
                   .then(reddit('/api/v1/me').get)
                   .then(function(data) {
                     expect(data.name).to.equal(config.reddit.login.username);
                   });
    });

    it('should GET resources when logged in (respect parameters)', function() {

      var reddit = util.getScriptInstance([ 'identity', 'mysubreddits' ]);

      return reddit.auth().then(function() {
        return reddit('/subreddits/mine/$where').get({
          $where: 'subscriber',
          limit: 2
        });
      }).then(function(result) {
        expect(result.data.children.length).to.equal(2);
      });
    });

  });


});
