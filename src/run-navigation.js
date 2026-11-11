// A fresh document applies the purchased upgrades to all generated geometry.
// Keep the deployment subdirectory and avoid reusing a stale cached document.
export function nextRunURL(href,nonce=Date.now()){
  const url=new URL(href);
  url.searchParams.set('sunny-run',String(nonce));
  return url.href;
}
