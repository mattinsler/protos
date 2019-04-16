const RX = {
  GitAtGithub: new RegExp('^git@github.com:([a-z0-9._-]+)/([a-z0-9._-]+).git$'),
  HttpsGithub: new RegExp('^https://github.com/([a-z0-9._-]+)/([a-z0-9._-]+).git$')
  // UserRepo: new RegExp('^([a-z0-9._-]+)/([a-z0-9._-]+)$')
};

export function parseUrl(url: string): null | { repo: string; user: string } {
  let match;

  if ((match = url.match(RX.GitAtGithub))) {
    return { repo: match[2], user: match[1] };
  } else if ((match = url.match(RX.HttpsGithub))) {
    return { repo: match[2], user: match[1] };
    // } else if ((match = url.match(RX.UserRepo))) {
    //   return { repo: match[2], user: match[1] };
  }

  return null;
}

export function formatDownloadUrl({ repo, user }: { repo: string; user: string }) {
  return `https://github.com/${user}/${repo}/archive/master.tar.gz`;
}
