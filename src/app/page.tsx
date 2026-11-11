import type { Metadata } from 'next';
import Link from 'next/link';
import { PREFERRED_LOCALE_KEY } from '@/lib/locale-path';

export const metadata: Metadata = {
  title: 'Help Center',
  robots: { index: false, follow: false },
};

/**
 * `/` has no content of its own. Behind the CDN, an edge function sends
 * readers to `/en/` or `/tr/` before this page is served; locally, and on any
 * other host, this page does: a remembered choice first, then the browser's
 * languages, then English — with plain links if script is off.
 */
const redirectScript = `(function(){var l='en';try{var s=localStorage.getItem(${JSON.stringify(PREFERRED_LOCALE_KEY)});if(s==='en'||s==='tr'){l=s;}else{var a=navigator.languages||[navigator.language||''];for(var i=0;i<a.length;i++){if(/^tr\\b/i.test(a[i])){l='tr';break;}if(/^en\\b/i.test(a[i])){break;}}}}catch(e){}location.replace('/'+l+'/');})();`;

export default function RootRedirect() {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
        <p>
          <Link href="/en/">English</Link> ·{' '}
          <Link href="/tr/" lang="tr" hrefLang="tr">
            Türkçe
          </Link>
        </p>
      </body>
    </html>
  );
}
