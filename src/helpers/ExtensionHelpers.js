const bip39 = require('bip39');
import * as HDKey from 'hdkey';
import Toast from './responseHandler';
import { toChecksumAddress } from './addressUtils';
import ealDarklist from '@/url-darklist/eal-blacklisted-domains.json';
import iosiroDarklist from '@/url-darklist/iosiro-blacklisted-domains.json';
import mewDarklist from '@/url-darklist/mew-blacklisted-domains.json';
import phishfortDarklist from '@/url-darklist/phishfort-blacklisted-domains.json';
import mewLightlist from '@/url-lightlist/mew-whitelisted-domains.json';
import ealLightlist from '@/url-lightlist/eal-whitelisted-domains.json';
import { getMode } from '@/builds/configs';
const useHash = getMode() === 'hash' ? '#' : '';

const similarity = require('similarity');
const punycode = require('punycode');
const uniMap = require('unicode/category/Ll');
const homoglyphs = require('./homoglyphs');
const levenshtein = require('levenshtein');

const checkUrlSimilarity = (url, arr) => {
  const newUrl = transformHomoglyphs(parseUrl(url));
  if (isSimilar(newUrl, url, arr, 0.8) && !isNewBlacklist(url, arr)) {
    return true;
  }

  return false;
};

const isNewBlacklist = (url, arr) => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === url) {
      return false;
    }
  }
  return true;
};

const isSimilar = (newUrl, comparedToUrl, arr, percent) => {
  for (let i = 0; i < arr.length; i++) {
    const sim = similarity(arr[i], newUrl);
    if (sim >= percent || !levenshteinCheck(comparedToUrl, arr[i])) {
      return true;
    }
  }

  return false;
};

const parseUrl = url => {
  try {
    return punycode.toUnicode(url);
  } catch (e) {
    return url;
  }
};

const levenshteinCheck = (url, validString) => {
  const distance = new levenshtein(url, validString).distance;
  const holisticStd = 3.639774978064392;
  const holisticLimit = 4 + 1 * holisticStd;
  return distance > 0 && distance < holisticLimit ? true : false;
};

const transformHomoglyphs = str => {
  let asciiStr = '';
  for (const char of str) {
    const uInfo = uniMap[char.charCodeAt(0)];

    if (uInfo && uInfo.mapping) {
      const maps = uInfo.mapping.split(' ');
      asciiStr += String.fromCharCode(parseInt('0x') + maps[0]);
    } else {
      asciiStr += homoglyphs[char] ? homoglyphs[char] : char;
    }
  }

  return asciiStr;
};

const extractHostname = url => {
  let hostname;
  if (url.indexOf('://') > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  hostname = hostname.split(':')[0];
  hostname = hostname.split('?')[0];

  return hostname;
};

const extractRootDomain = url => {
  let domain = extractHostname(url);
  const splitArr = domain.split('.');
  const arrLen = splitArr.length;

  if (arrLen > 2) {
    domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
    if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
      domain = splitArr[arrLen - 3] + '.' + domain;
    }
  }

  return domain.toLowerCase();
};

const blackListDomains = {
  eal: {
    domains: ealDarklist,
    identifier: 'eal'
  },
  iosiro: {
    domains: iosiroDarklist,
    identifier: 'iosiro'
  },
  phishfort: {
    domains: phishfortDarklist,
    identifier: 'phishfort'
  },
  mew: {
    domains: mewDarklist,
    identifier: 'mew'
  }
};

const whiteListDomains = {
  eal: {
    domains: mewLightlist,
    identifier: 'eal-whitelist'
  },
  mew: {
    domains: ealLightlist,
    identifier: 'mew-whitelist'
  }
};

const buildMode = function() {
  return useHash;
};
const getAccounts = callback => {
  const chrome = window.chrome;
  chrome.storage.sync.get(null, callback);
};

const getPrivFromMnemonicWallet = (mnemonic, path) => {
  const hdKey = HDKey.fromMasterSeed(bip39.mnemonicToSeedSync(mnemonic, ''));
  return hdKey.derive(path)._privateKey;
};

const addWalletToStore = (address, encStr, nickname, type, callback) => {
  const checksummedAddr = toChecksumAddress(address).toLowerCase();
  const chrome = window.chrome;
  nickname = nickname.replace(/(<([^>]+)>)/gi, '');
  const value = {
    nick: nickname,
    priv: encStr,
    type: type
  };
  if (!encStr) delete value['priv'];
  const obj = {};
  obj[checksummedAddr] = JSON.stringify(value);
  try {
    chrome.storage.sync.set(obj, callback);
  } catch (e) {
    Toast.responseHandler('Something went wrong!', Toast.ERROR);
  }
};

const deleteWalletFromStore = (addr, callback) => {
  const chrome = window.chrome;
  try {
    chrome.storage.sync.remove(toChecksumAddress(addr).toLowerCase(), callback);
  } catch (e) {
    Toast.responseHandler('Something went wrong!', Toast.ERROR);
  }
};

export default {
  getAccounts,
  addWalletToStore,
  getPrivFromMnemonicWallet,
  deleteWalletFromStore,
  checkUrlSimilarity,
  extractRootDomain,
  blackListDomains,
  whiteListDomains,
  buildMode
};
