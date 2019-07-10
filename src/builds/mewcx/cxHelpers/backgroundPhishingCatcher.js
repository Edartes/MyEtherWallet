import ExtensionHelpers from '@/helpers/ExtensionHelpers';
const chrome = window.chrome;
(function() {
  /* eslint no-undef: 0 no-console:0 */
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
    querycB(tabs[0]);
  });

  chrome.tabs.onActivated.addListener(onUpdatedCb);
  chrome.tabs.onUpdated.addListener(onActivatedCb);

  function onUpdatedCb(_, __, tabs) {
    querycB(tabs);
  }
  function onActivatedCb(info) {
    chrome.tabs.get(info.tabId, function(tab) {
      querycB(tab);
    });
  }

  function querycB(tab) {
    if (typeof tab !== 'undefined') {
      const SEARCH_STRING = ['myetherwallet'];
      const ealBlacklisted = Object.assign(
          {},
          ExtensionHelpers.blackListDomains['eal']
        ),
        iosiroBlacklisted = Object.assign(
          {},
          ExtensionHelpers.blackListDomains['iosiro']
        ),
        phishfortBlacklisted = Object.assign(
          {},
          ExtensionHelpers.blackListDomains['phishfort']
        ),
        mewBlacklisted = Object.assign(
          {},
          ExtensionHelpers.blackListDomains['mew']
        ),
        ealWhitelisted = Object.assign(
          {},
          ExtensionHelpers.whiteListDomains['eal']
        ),
        mewWhitelisted = Object.assign(
          {},
          ExtensionHelpers.whiteListDomains['mew']
        );

      let allBlacklistedDomains = [];
      let allWhitelistedDomains = [];
      allBlacklistedDomains = ealBlacklisted.domains
        .concat(iosiroBlacklisted.domains)
        .concat(phishfortBlacklisted.domains)
        .concat(mewBlacklisted.domains);
      allWhitelistedDomains = mewWhitelisted.domains.concat(
        ealWhitelisted.domains
      );

      let urlRedirect;
      const foundWhitelist = allWhitelistedDomains.find(dom => {
        if (tab.length > 0) {
          return dom === ExtensionHelpers.extractRootDomain(tab.url);
        }
        return undefined;
      });
      const foundBlacklist = allBlacklistedDomains.find(dom => {
        if (tab.length > 0) {
          return dom === ExtensionHelpers.extractRootDomain(tab.url);
        }
        return undefined;
      });

      if (foundWhitelist === undefined) {
        if (
          foundBlacklist !== undefined ||
          ExtensionHelpers.checkUrlSimilarity(tab.url, SEARCH_STRING)
        ) {
          urlRedirect = encodeURI(
            `https://www.myetherwallet.com/phishing.html?phishing-address=${tab.url}`
          );
          chrome.tabs.update(null, { url: urlRedirect });
        }
      }
    }
  }
})();
