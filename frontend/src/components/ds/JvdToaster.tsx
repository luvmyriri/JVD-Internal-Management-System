import { Toaster } from 'react-hot-toast';

/** Mount once at the app root. */
export function JvdToaster() {
  return <Toaster position="top-right" containerClassName="jvd" gutter={10} />;
}
