import { extname } from 'node:path';

import {
  CONST_MIME_APPLICATION_JSON,
  CONST_MIME_APPLICATION_OCTET_STREAM,
  CONST_MIME_IMAGE_GIF,
  CONST_MIME_IMAGE_JPEG,
  CONST_MIME_IMAGE_PNG,
  CONST_MIME_IMAGE_SVG_XML,
  CONST_MIME_IMAGE_WEBP,
  CONST_MIME_IMAGE_X_ICON,
  CONST_MIME_TEXT_CSS,
  CONST_MIME_TEXT_HTML,
  CONST_MIME_TEXT_JAVASCRIPT,
} from '@http';

function getMIMEByPath(p: string) {
  const ext = extname(p).toLowerCase();

  switch (ext) {
    case '.html':
      return CONST_MIME_TEXT_HTML;
    case '.js':
      return CONST_MIME_TEXT_JAVASCRIPT;
    case '.css':
      return CONST_MIME_TEXT_CSS;
    case '.json':
      return CONST_MIME_APPLICATION_JSON;
    case '.png':
      return CONST_MIME_IMAGE_PNG;
    case '.jpg':
    case '.jpeg':
      return CONST_MIME_IMAGE_JPEG;
    case '.gif':
      return CONST_MIME_IMAGE_GIF;
    case '.svg':
      return CONST_MIME_IMAGE_SVG_XML;
    case '.webp':
      return CONST_MIME_IMAGE_WEBP;
    case '.ico':
      return CONST_MIME_IMAGE_X_ICON;
    default:
      break;
  }

  return CONST_MIME_APPLICATION_OCTET_STREAM;
}

function getWrappedWithCharset(contentType: string, charset = 'utf-8') {
  return `${contentType}; charset=${charset}`;
}

export { getMIMEByPath, getWrappedWithCharset };
