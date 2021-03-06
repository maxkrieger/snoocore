/* global describe, it */
import './snoocore-mocha';

var when = require('when');
var delay = require('when/delay');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;

var tsi = require('./testServerInstance');
var util = require('./util');
var config = require('../config');

import OAuth, {TOKEN} from '../../src/OAuth';
import Throttle from '../../src/Throttle';
import Request from '../../src/Request';

describe(__filename, function (require) {

  this.timeout(config.testTimeout);

  var throttle = new Throttle(1000);
  var request = new Request(throttle);

  describe('normalizeScope()', function() {
    it('should convert an array of scopes into a CSV string', function() {
      var userConfig = util.getExplicitUserConfig([ 'flair', 'foobar' ]);
      var oauth = new OAuth(userConfig, request);
      expect(oauth.scope).to.equal('flair,foobar');
    });
  });

  describe('hasRefreshToken()', function() {
    it('should not have a refresh token starting out', function() {
      var userConfig = util.getExplicitUserConfig([ 'flair', 'foobar' ]);
      var oauth = new OAuth(userConfig, request);
      expect(oauth.hasRefreshToken()).to.equal(false);
    });

    // Checking that it gets set / unset takes place in other tests
    // properly in authentication / deauthentication
  });

  describe('isAuthenticated()', function() {
    it('should not be authenticated initially', function() {
      var userConfig = util.getExplicitUserConfig([ 'flair', 'foobar' ]);
      var oauth = new OAuth(userConfig, request);
      expect(oauth.hasAccessToken()).to.equal(false);
    });

    // Checking that this changes / is properly updated gets tested in
    // other places
  });

  describe('getAuthorizationHeader()', function() {
    it('should initially be set to invalid token', function() {
      var userConfig = util.getExplicitUserConfig([ 'flair', 'foobar' ]);
      var oauth = new OAuth(userConfig, request);
      expect(oauth.getAuthorizationHeader()).to.equal(
        'bearer ' + TOKEN.INVALID);
    });
  });

  describe('canRefreshAccessToken()', function() {
    it('should be able to refresh token (script)', function() {
      var userConfig = util.getScriptUserConfig([ 'flair' ]);
      var oauth = new OAuth(userConfig, request);
      expect(oauth.canRefreshAccessToken()).to.equal(true);
    });

    it('should be able to refresh token (explicit permanent)', function() {
      var userConfig = util.getExplicitUserConfig([ 'flair' ], 'permanent');
      var oauth = new OAuth(userConfig, request);
      oauth.setRefreshToken('foobar');
      expect(oauth.canRefreshAccessToken()).to.equal(true);
    });

    it('should not be able to refresh token (explicit permanent NO refresh token)', function() {
      var userConfig = util.getExplicitUserConfig([ 'flair' ], 'permanent');
      var oauth = new OAuth(userConfig, request);
      expect(oauth.canRefreshAccessToken()).to.equal(false);
    });

    it('should not be to refresh token (explicit temporary)', function() {
      var userConfig = util.getExplicitUserConfig([ 'flair' ]);
      var oauth = new OAuth(userConfig, request);
      expect(oauth.canRefreshAccessToken()).to.equal(false);
    });

    it('should not be to refresh token (implicit)', function() {
      var userConfig = util.getImplicitUserConfig([ 'flair' ]);
      var oauth = new OAuth(userConfig, request);
      expect(oauth.canRefreshAccessToken()).to.equal(false);
    });
  });

  describe('getExplicitAuthUrl()', function() {
    it('should get a proper authorization url (WEB/INSTALLED)', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getExplicitAuthUrl('foo');

      expect(url.indexOf('https://www.reddit.com/api/v1/authorize?')).to.not.equal(-1);
      expect(url.indexOf('client_id=' + config.reddit.web.key)).to.not.equal(-1);
      expect(url.indexOf('state=foo')).to.not.equal(-1);
      expect(url.indexOf('redirect_uri=' + encodeURIComponent(config.reddit.redirectUri))).to.not.equal(-1);
      expect(url.indexOf('duration=temporary')).to.not.equal(-1);
      expect(url.indexOf('response_type=code')).to.not.equal(-1);
      expect(url.indexOf('scope=identity')).to.not.equal(-1);
    });

    it('should get a proper authorization url (mobile friendly) (WEB/INSTALLED)', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ], void 0, true);
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getExplicitAuthUrl('foo');

      expect(url.indexOf('https://www.reddit.com/api/v1/authorize.compact?')).to.not.equal(-1);
      expect(url.indexOf('client_id=' + config.reddit.web.key)).to.not.equal(-1);
      expect(url.indexOf('state=foo')).to.not.equal(-1);
      expect(url.indexOf('redirect_uri=' + encodeURIComponent(config.reddit.redirectUri))).to.not.equal(-1);
      expect(url.indexOf('duration=temporary')).to.not.equal(-1);
      expect(url.indexOf('response_type=code')).to.not.equal(-1);
      expect(url.indexOf('scope=identity')).to.not.equal(-1);
    });

    it('should get back a proper authorization url (multiple scopes) (WEB/INSTALLED)', function() {
      var userConfig = util.getExplicitUserConfig([
        'identity',
        'read',
        'subscribe'
      ]);
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getExplicitAuthUrl('foo');

      expect(url.indexOf('https://www.reddit.com/api/v1/authorize?')).to.not.equal(-1);
      expect(url.indexOf('client_id=' + config.reddit.web.key)).to.not.equal(-1);
      expect(url.indexOf('state=foo')).to.not.equal(-1);
      expect(url.indexOf('redirect_uri=' + encodeURIComponent(config.reddit.redirectUri))).to.not.equal(-1);
      expect(url.indexOf('duration=temporary')).to.not.equal(-1);
      expect(url.indexOf('response_type=code')).to.not.equal(-1);
      expect(url.indexOf('scope=' + encodeURIComponent('identity,read,subscribe'))).to.not.equal(-1);
    });

  });

  describe('getImplicitAuthUrl()', function() {
    it('should get back an implicit grant authorization url', function() {

      var userConfig = util.getImplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getImplicitAuthUrl('foo');

      expect(url.indexOf('https://www.reddit.com/api/v1/authorize?')).to.not.equal(-1);
      expect(url.indexOf('client_id=' + config.reddit.installed.key)).to.not.equal(-1);
      expect(url.indexOf('state=foo')).to.not.equal(-1);
      expect(url.indexOf('redirect_uri=' + encodeURIComponent(config.reddit.redirectUri))).to.not.equal(-1);
      expect(url.indexOf('response_type=token')).to.not.equal(-1);
      expect(url.indexOf('scope=' + encodeURIComponent('identity'))).to.not.equal(-1);
    });
  });

  describe('getAuthUrl()', function() {

    it('should get the explicit auth url', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);

      // EXPLICIT
      var url = oauth.getAuthUrl('foo');

      expect(url.indexOf('https://www.reddit.com/api/v1/authorize?')).to.not.equal(-1);
      expect(url.indexOf('client_id=' + config.reddit.web.key)).to.not.equal(-1);
      expect(url.indexOf('state=foo')).to.not.equal(-1);
      expect(url.indexOf('redirect_uri=' + encodeURIComponent(config.reddit.redirectUri))).to.not.equal(-1);
      expect(url.indexOf('duration=temporary')).to.not.equal(-1);
      expect(url.indexOf('response_type=code')).to.not.equal(-1);
      expect(url.indexOf('scope=identity')).to.not.equal(-1);
    });

    it('should get the implicit auth url', function() {
      var userConfig = util.getImplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);

      // IMPLICIT
      var url = oauth.getAuthUrl('foo');

      expect(url.indexOf('https://www.reddit.com/api/v1/authorize?')).to.not.equal(-1);
      expect(url.indexOf('client_id=' + config.reddit.installed.key)).to.not.equal(-1);
      expect(url.indexOf('state=foo')).to.not.equal(-1);
      expect(url.indexOf('redirect_uri=' + encodeURIComponent(config.reddit.redirectUri))).to.not.equal(-1);
      expect(url.indexOf('response_type=token')).to.not.equal(-1);
      expect(url.indexOf('scope=' + encodeURIComponent('identity'))).to.not.equal(-1);
    });
  });


  describe('getAppOnlyTokenData()', function() {
    it('get the correct data for script / explicit', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);

      expect(oauth.getAppOnlyTokenData()).to.eql({
        scope: 'identity',
        grant_type: 'client_credentials'
      });
    });

    it('get the correct data for implicit', function() {
      var userConfig = util.getImplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);

      expect(oauth.getAppOnlyTokenData()).to.eql({
        scope: 'identity',
        grant_type: 'https://oauth.reddit.com/grants/installed_client',
        device_id: 'DO_NOT_TRACK_THIS_DEVICE'
      });
    });
  });

  describe('getAuthenticatedTokenData()', function() {
    it('should get the correct data for script', function() {
      var userConfig = util.getScriptUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);

      expect(oauth.getAuthenticatedTokenData()).to.eql({
        scope: 'identity',
        grant_type: 'password',
        username: config.reddit.login.username,
        password: config.reddit.login.password
      });
    });

    it('should get the correct data for explicit', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);

      expect(oauth.getAuthenticatedTokenData('some_auth_code')).to.eql({
        scope: 'identity',
        grant_type: 'authorization_code',
        client_id: config.reddit.web.key,
        redirect_uri: config.reddit.redirectUri,
        code: 'some_auth_code'
      });
    });

  });

  describe('getRefreshTokenData()', function() {
    it('should get the correct data for a refresh token', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);

      expect(oauth.getRefreshTokenData('a_refresh_token')).to.eql({
        scope: 'identity',
        grant_type: 'refresh_token',
        refresh_token: 'a_refresh_token'
      });
    });
  });

  describe('getToken()', function() {

    it.node('(Explicit) it should get an access token', function() {

      var userConfig = util.getExplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getAuthUrl('foo');

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {

        if (params.error) { throw new Error(params.error); }

        expect(params.state).to.equal('foo');
        expect(params.code).to.be.a('string');

        var authorizationCode = params.code;

        return oauth.getToken(TOKEN.EXPLICIT, {
          authorizationCode: authorizationCode,
        });
      }).then(function(authData) {
        expect(authData).to.be.an('object');
        if (authData.error) { throw new Error(authData.error); }

        expect(authData.access_token).to.be.a('string');
        expect(authData.token_type).to.equal('bearer');
        expect(authData.expires_in).to.equal(3600);
        expect(authData.scope).to.equal('identity');
      });
    });

    it.node('(Script) should get an access token', function() {

      var userConfig = util.getScriptUserConfig();
      var oauth = new OAuth(userConfig, request);

      return oauth.getToken(TOKEN.SCRIPT).then(function(authData) {
        expect(authData).to.be.an('object');

        if (authData.error) { throw new Error(authData.error); }

        expect(authData.access_token).to.be.a('string');
        expect(authData.token_type).to.equal('bearer');
        expect(authData.expires_in).to.equal(3600);
        expect(authData.scope).to.equal('*');
      });
    });

    it.node('(Script + 1 scope) should get an access token', function() {

      var userConfig = util.getScriptUserConfig([ 'flair' ]);
      var oauth = new OAuth(userConfig, request);

      return oauth.getToken(TOKEN.SCRIPT).then(function(authData) {
        expect(authData).to.be.an('object');

        if (authData.error) { throw new Error(authData.error); }

        expect(authData.access_token).to.be.a('string');
        expect(authData.token_type).to.equal('bearer');
        expect(authData.expires_in).to.equal(3600);
        expect(authData.scope).to.equal('flair');
      });
    });

    it.node('(Script + multiple scopes) should get an access token', function() {
      var userConfig = util.getScriptUserConfig([ 'flair', 'identity' ]);
      var oauth = new OAuth(userConfig, request);

      return oauth.getToken(TOKEN.SCRIPT).then(function(authData) {
        expect(authData).to.be.an('object');

        if (authData.error) { throw new Error(authData.error); }

        expect(authData.access_token).to.be.a('string');
        expect(authData.token_type).to.equal('bearer');
        expect(authData.expires_in).to.equal(3600);
        expect(authData.scope).to.equal('flair identity');
      });
    });

    it('(Application only implicit) should get Application only access token', function() {
      var userConfig = util.getImplicitUserConfig();
      var oauth = new OAuth(userConfig, request);

      return oauth.getToken(TOKEN.APP_ONLY).then(function(authData) {
        expect(authData).to.be.an('object');

        if (authData.error) { throw new Error(authData.error); }

        expect(authData.access_token).to.be.a('string');
        expect(authData.token_type).to.equal('bearer');
        expect(authData.expires_in).to.equal(3600);
        expect(authData.scope).to.equal('*');
      });
    });

    it.node('(Application only script/web) should get Application only access token', function() {

      var userConfig = util.getScriptUserConfig();
      var oauth = new OAuth(userConfig, request);

      return oauth.getToken(TOKEN.APP_ONLY).then(function(authData) {
        expect(authData).to.be.an('object');

        if (authData.error) { throw new Error(authData.error); }

        expect(authData.access_token).to.be.a('string');
        expect(authData.token_type).to.equal('bearer');
        expect(authData.expires_in).to.equal(3600);
        expect(authData.scope).to.equal('*');
      });
    });

  });

  describe('auth()', function() {

    it.node('application only auth (explicit/script)', function() {
      var userConfig = util.getScriptUserConfig();
      var oauth = new OAuth(userConfig, request);

      expect(oauth.hasAccessToken()).to.equal(false);
      return oauth.auth(void 0, true).then(function(authData) {
        expect(oauth.hasAccessToken()).to.equal(true);
      });
    });

    it.node('script oauth', function() {
      var userConfig = util.getScriptUserConfig();
      var oauth = new OAuth(userConfig, request);

      expect(oauth.hasAccessToken()).to.equal(false);
      return oauth.auth().then(function() {
        expect(oauth.hasAccessToken()).to.equal(true);
      });
    });

    it.node('explicit oauth (duration temporary)', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getAuthUrl('foo');

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        if (params.error) { throw new Error(params.error); }
        expect(params.state).to.equal('foo');
        expect(params.code).to.be.a('string');
        var authorizationCode = params.code;
        return oauth.auth(authorizationCode);

      }).then(function(refreshToken) {
        expect(typeof refreshToken).to.equal('undefined');
        expect(oauth.hasRefreshToken()).to.equal(false);
        expect(oauth.hasAccessToken()).to.equal(true);
      });
    });

    it.node('explicit oauth (duration permanent)', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ], 'permanent');
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getAuthUrl('foo');

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        if (params.error) { throw new Error(params.error); }
        var authorizationCode = params.code;
        return oauth.auth(authorizationCode);
      }).then(function(refreshToken) {
        expect(typeof refreshToken).to.equal('string');
        expect(oauth.hasRefreshToken()).to.equal(true);
        expect(oauth.hasAccessToken()).to.equal(true);
        expect(oauth.getRefreshToken()).to.equal(refreshToken);
      });
    });

    it.node('implicit oauth', function() {
      var userConfig = util.getImplicitUserConfig([ 'identity' ]);
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getAuthUrl('foo');

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        if (params.error) { throw new Error(params.error); }
        var accessToken = params['access_token'];
        return oauth.auth(accessToken);
      }).then(function() {
        expect(oauth.hasAccessToken()).to.equal(true);
        expect(oauth.hasRefreshToken()).to.equal(false);
      });
    });

  });

  describe('applicationOnlyOAuth()', function() {
    it.node('application only auth (script)', function() {
      var userConfig = util.getScriptUserConfig();
      var oauth = new OAuth(userConfig, request);
      return oauth.applicationOnlyAuth().then(function(authData) {
        expect(oauth.hasAccessToken()).to.equal(true);
      });
    });
  });

  describe('setAccessToken()', function() {
    it.node('should set the access token directly', function() {
      var userConfig = util.getScriptUserConfig();
      var oauth = new OAuth(userConfig, request);
      expect(typeof oauth.getAccessToken()).to.equal('undefined');
      oauth.setAccessToken('foobar');
      expect(oauth.getAccessToken()).to.equal('foobar');
    });
  });

  describe.node('refresh()', function() {

    it('should not refresh', function(done) {
      var userConfig = util.getExplicitUserConfig([ 'identity' ], 'permanent');
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getAuthUrl('foo');

      expect(oauth.hasRefreshToken()).to.equal(false);
      expect(typeof oauth.getRefreshToken()).to.equal('undefined');

      return oauth.refresh().then(function() {
        done(new Error('should not get here & should fail'));
      }).catch(function(error) {
        done();
      });
    });

    it('should refresh the access token (internal / same instance)', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ], 'permanent');
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getAuthUrl('foo');

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        if (params.error) { throw new Error(params.error); }
        var authorizationCode = params.code;

        expect(oauth.hasRefreshToken()).to.equal(false);
        expect(typeof oauth.getRefreshToken()).to.equal('undefined');
        expect(typeof oauth.getAccessToken()).to.equal('undefined');

        return oauth.auth(authorizationCode);
      }).then(function(refreshToken) {
        expect(oauth.hasRefreshToken()).to.equal(true);
        expect(oauth.getRefreshToken()).to.equal(refreshToken);

        expect(typeof oauth.accessToken).to.equal('string');
        expect(oauth.accessToken).to.equal(oauth.getAccessToken());

        var oldAccessToken = oauth.accessToken;

        var EVENT_NEW_ACCESS_TOKEN;

        var refreshPromise = oauth.refresh();
        var eventPromise = when.promise(function(resolve, reject) {
          oauth.on('access_token_refreshed', function(newAccessToken) {
            EVENT_NEW_ACCESS_TOKEN = newAccessToken;
            resolve();
          });
        });

        return when.all([
          refreshPromise,
          eventPromise
        ]).then(function() {
          expect(oauth.accessToken).to.not.equal(oldAccessToken);
          expect(oauth.getAccessToken()).to.equal(EVENT_NEW_ACCESS_TOKEN);
        });
      });
    });

    it('should refresh the access token (new instance)', function() {
      var userConfig = util.getExplicitUserConfig([ 'identity' ], 'permanent');
      var oauthA = new OAuth(userConfig, request);
      var oauthB = new OAuth(userConfig, request);
      var url = oauthA.getAuthUrl('foo');

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        if (params.error) { throw new Error(params.error); }
        var authorizationCode = params.code;

        // Authenticate with the first instance. Get a refresh token.
        return oauthA.auth(authorizationCode);
      }).then(function(refreshToken) {
        expect(oauthA.hasAccessToken()).to.equal(true);
        expect(oauthA.hasRefreshToken()).to.equal(true);

        // Use the refresh token to authenticate with the second
        // fresh OAuth instance:
        return oauthB.refresh(refreshToken);
      }).then(function() {
        expect(oauthB.hasAccessToken()).to.equal(true);
        expect(oauthB.hasRefreshToken()).to.equal(true);
      });
    });
  });

  describe.node('setRefreshToken()', function() {
    it('should set the refresh token directly', function() {
      var userConfig = util.getScriptUserConfig();
      var oauth = new OAuth(userConfig, request);
      expect(typeof oauth.getRefreshToken()).to.equal('undefined');
      oauth.setRefreshToken('foobar');
      expect(oauth.getRefreshToken()).to.equal('foobar');
    });
  });

  describe('deauth()', function() {
    it.node('should auth (script), deauth, and not reauth', function() {
      var userConfig = util.getScriptUserConfig();
      var oauth = new OAuth(userConfig, request);
      return oauth.auth().then(function(authData) {
        expect(oauth.hasAccessToken()).to.equal(true);
        return oauth.deauth();
      }).then(function() {
        expect(oauth.hasAccessToken()).to.equal(false);
      });
    });

    it.node('should auth (explicit), deauth, and reauth with refresh token', function(done) {
      var userConfig = util.getExplicitUserConfig([ 'identity' ], 'permanent');
      var oauth = new OAuth(userConfig, request);
      var url = oauth.getAuthUrl('foo');

      return tsi.standardServer.allowAuthUrl(url).then(function(params) {
        if (params.error) { throw new Error(params.error); }
        var authorizationCode = params.code;
        return oauth.auth(authorizationCode);
      }).then(function(refreshToken) {

        expect(oauth.hasAccessToken()).to.equal(true);
        expect(oauth.hasRefreshToken()).to.equal(true);

        return oauth.deauth().then(function() {
          expect(oauth.hasAccessToken()).to.equal(false);
          expect(oauth.hasRefreshToken()).to.equal(true);
          return oauth.refresh();
        }).then(function() {
          expect(oauth.hasAccessToken()).to.equal(true);
          expect(oauth.hasRefreshToken()).to.equal(true);
          return oauth.deauth(refreshToken);
        }).then(function() {
          expect(oauth.hasAccessToken()).to.equal(false);
          expect(oauth.hasRefreshToken()).to.equal(false);
          // the refresh token should be invalid / can not
          // use it any longer to renew
          return oauth.refresh(refreshToken).then(function() {
            done(new Error('should have errored'));
          }).catch(function(error) {
            done();
          });
        });
      });

    });
  });

});
