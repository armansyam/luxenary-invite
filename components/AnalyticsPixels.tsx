"use client";

import Script from "next/script";
import { sanitizeGa4MeasurementId, sanitizeMetaPixelId, sanitizeTikTokPixelId } from "@/lib/pixelValidation";

interface AnalyticsPixelsProps {
  metaPixelId?: string;
  tiktokPixelId?: string;
  ga4MeasurementId?: string;
  nonce?: string;
}

export function AnalyticsPixels({
  metaPixelId,
  tiktokPixelId,
  ga4MeasurementId,
  nonce,
}: AnalyticsPixelsProps) {
  const safeMeta = sanitizeMetaPixelId(metaPixelId);
  const safeTiktok = sanitizeTikTokPixelId(tiktokPixelId);
  const safeGa4 = sanitizeGa4MeasurementId(ga4MeasurementId);

  if (!safeMeta && !safeTiktok && !safeGa4) return null;

  return (
    <>
      {safeMeta && (
        <Script
          id="lux-meta-pixel"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(safeMeta)});fbq('track','PageView');`,
          }}
        />
      )}

      {safeTiktok && (
        <Script
          id="lux-tiktok-pixel"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+encodeURIComponent(e)+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(${JSON.stringify(safeTiktok)});ttq.page();}(window,document,'ttq');`,
          }}
        />
      )}

      {safeGa4 && (
        <>
          <Script
            id="lux-ga4-src"
            strategy="afterInteractive"
            nonce={nonce}
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(safeGa4)}`}
          />
          <Script
            id="lux-ga4-init"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(safeGa4)});`,
            }}
          />
        </>
      )}
    </>
  );
}
