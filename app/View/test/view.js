import { Fynix, nixStore, nixForm, Path } from "@fynix";

export default function Dashboard() {
  const name = nixStore("user.name", "Guest");

  // Form example with validation
  const form = nixForm(
    { email: "", message: "" },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Please enter a valid email",
      },
      message: {
        required: true,
        minLength: 10,
        message: "Message must be at least 10 characters",
      },
    }
  );

  async function handleSubmit(values) {
    console.log("Form submitted:", values);
    alert(`Email: ${values.email}\nMessage: ${values.message}`);
    form.reset();
  }

  return (
    <div class="p-4 border-t mt-2 max-w-2xl mx-auto">
      <h3 class="mb-4 text-xl font-semibold">Dashboard Component</h3>

      {/* Shared Store Example */}
      <div class="mb-6 p-4 bg-gray-50 rounded">
        <h4 class="font-medium mb-2">Shared Store Example</h4>
        <p class="mb-2">Name: {name.value}</p>
        <input
          type="text"
          value={name.value}
          r-input={(e) => (name.value = e.target.value)}
          placeholder="Type your name..."
          class="border rounded p-2 w-full"
        />
      </div>

      {/* Form Helper Example */}
      <div class="mb-6 p-4 bg-blue-50 rounded">
        <h4 class="font-medium mb-4">Form Helper Example</h4>
        <form
          r-submit={(e) => {
            e.preventDefault();
            form.handleSubmit(handleSubmit);
          }}
        >
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              {...form.getFieldProps("email")}
              placeholder="your@email.com"
              class={`w-full px-3 py-2 border rounded ${
                form.errors.value.email && form.touched.value.email
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {form.errors.value.email && form.touched.value.email && (
              <p class="text-red-500 text-sm mt-1">{form.errors.value.email}</p>
            )}
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Message</label>
            <textarea
              {...form.getFieldProps("message")}
              placeholder="Enter your message..."
              rows="4"
              class={`w-full px-3 py-2 border rounded ${
                form.errors.value.message && form.touched.value.message
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            ></textarea>
            {form.errors.value.message && form.touched.value.message && (
              <p class="text-red-500 text-sm mt-1">
                {form.errors.value.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={form.isSubmitting.value || !form.isValid.value}
            class={`px-4 py-2 rounded text-white ${
              form.isSubmitting.value || !form.isValid.value
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {form.isSubmitting.value ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>

      <Path to="/" value="← Go Back" />
    </div>
  );
}
