import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-8 sm:p-12">
        <Link
          href="/"
          className="text-primary font-bold text-base hover:opacity-80 inline-block mb-8"
        >
          ← Back to CoWork
        </Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-6">
          Privacy Policy
        </h1>
        
        <p className="text-gray-500 mb-8">
          Last updated: April 19, 2026
        </p>

        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Welcome to CoWork. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Data We Collect</h2>
            <p className="text-gray-600 leading-relaxed">
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc ml-6 mt-3 text-gray-600 space-y-2">
              <li><strong>Identity Data:</strong> includes first name, last name, and username.</li>
              <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
              <li><strong>Usage Data:</strong> includes information about how you use our website and services.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <p className="text-gray-600 leading-relaxed">
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul className="list-disc ml-6 mt-3 text-gray-600 space-y-2">
              <li>To register you as a new customer.</li>
              <li>To manage your bookings and reservations at co-working spaces.</li>
              <li>To notify you about changes to our service or the status of a space you have booked.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
            </p>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <Link
            href="/register"
            className="bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-primary-hover transition-colors shadow-sm inline-block"
          >
            Return to Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
