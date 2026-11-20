import React from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { WEB_CSS } from '../src/lib/webStyles';

/**
 * Web document shell. Keeps the app full-height, sets the KESUUBIT palette and
 * makes focus states visible for keyboard users.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html lang="es" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#FBF7F9" />
        <meta
          name="description"
          content="KESUUBIT: instrumentos y accesorios con actitud de banda. Hecho para sonar en Oruro, Bolivia."
        />
        <ScrollViewStyleReset />
        {headNodes}
        <style
          dangerouslySetInnerHTML={{
            __html: WEB_CSS,
          }}
        />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
