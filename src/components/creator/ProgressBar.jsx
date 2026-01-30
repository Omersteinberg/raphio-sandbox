import { Check } from "lucide-react";

const steps = [
  { id: 0, label: "Chat & Upload" },
  { id: 1, label: "Sections & Voice" },
  { id: 2, label: "Preview" },
  { id: 3, label: "Processing" },
  { id: 4, label: "Complete" },
];

export default function ProgressBar({ currentStep }) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-all duration-300
                  ${
                    currentStep > step.id
                      ? "bg-purple-600 text-white"
                      : currentStep === step.id
                      ? "bg-purple-600 text-white ring-4 ring-purple-100"
                      : "bg-gray-200 text-gray-600"
                  }
                `}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id + 1
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium hidden sm:block
                  ${currentStep >= step.id ? "text-purple-700" : "text-gray-500"}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-12 sm:w-20 h-1 mx-2 rounded-full
                  ${currentStep > step.id ? "bg-purple-600" : "bg-gray-200"}
                `}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
