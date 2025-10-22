import Link from "next/link";

type Props = {
  searchParams: Promise<{
    errorCode?: string;
    message?: string;
  }>;
};

export default async function StackErrorPage({ searchParams }: Props) {
  // next requires awaiting searchParams in server components that use it
  const params = (await searchParams) ?? {};
  const errorCode = params.errorCode ?? "";
  const rawMessage = params.message ?? "An error occurred.";
  // message may be URL encoded and spaces encoded as + from some redirects
  const message = decodeURIComponent(String(rawMessage).replace(/\+/g, " "));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">An error occurred</h1>
        <p className="text-sm text-gray-600 mb-4">{message}</p>

        {errorCode === "CONTACT_CHANNEL_ALREADY_USED_FOR_AUTH_BY_SOMEONE_ELSE" ? (
          <>
            <p className="mb-4">
              It looks like this email is already registered with another account but the
              email hasn't been verified. To continue, please recover access to the original
              account and verify the email, or sign in with the same provider you used before.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/handler/forgot-password"
                className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm"
              >
                Recover / Verify Email
              </Link>

              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-md text-sm"
              >
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <div className="flex">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
