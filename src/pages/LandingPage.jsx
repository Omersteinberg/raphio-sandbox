import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Wand2, Upload, Video, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/create");
  };

  return (
    <div className="min-h-screen font-figtree" style={{ background: "linear-gradient(180deg, #FFF8F5 0%, #FFFFFF 60%, #F8F7FF 100%)" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-orange-100/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src="/Logo.svg" alt="Raphio" className="h-8" />
          </div>
          <Button
            onClick={handleGetStarted}
            className="text-white px-6 rounded-full border-0 font-semibold shadow-md shadow-orange-200/50 hover:shadow-lg hover:shadow-orange-200/60 transition-all"
            style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
          >
            Make a Video
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
              style={{ background: "#FFF0E6", color: "#E5582A" }}
            >
              100% free to try
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
            className="text-5xl md:text-6xl font-extrabold leading-tight mb-6"
            style={{ color: "#2D2235" }}
          >
            Turn your ideas into{" "}
            <span className="relative">
              <span style={{
                background: "linear-gradient(135deg, #F97066, #FB923C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                beautiful videos
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: "easeOut" }}
            className="text-lg md:text-xl mb-10 max-w-xl mx-auto leading-relaxed"
            style={{ color: "#6B5E7B" }}
          >
            Just describe what you want, add some pictures, and we'll turn it
            into a video with a professional voice. It's that easy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: "easeOut" }}
          >
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="text-white px-10 py-7 text-lg rounded-full border-0 font-bold shadow-xl shadow-orange-200/40 hover:shadow-2xl hover:shadow-orange-300/50 hover:scale-[1.02] transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
            >
              Try It Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How It Works — combines steps + features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#2D2235" }}>
              Three simple steps
            </h2>
            <p className="text-lg" style={{ color: "#6B5E7B" }}>
              No tech skills needed. If you can type, you can make a video.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Wand2 className="w-7 h-7" />,
                step: "1",
                title: "Tell us your idea",
                description:
                  "Just describe what your video should be about — like telling a friend. We'll write a professional script for you.",
                gradient: "linear-gradient(135deg, #FFF0E6, #FFE4D6)",
                iconBg: "#F97066",
                accent: "#FECACA",
              },
              {
                icon: <Upload className="w-7 h-7" />,
                step: "2",
                title: "Add your pictures",
                description:
                  "Upload photos or images for each scene. Don't have any? No worries — our AI can create them for you.",
                gradient: "linear-gradient(135deg, #EDE9FE, #E0D7FC)",
                iconBg: "#8B5CF6",
                accent: "#DDD6FE",
              },
              {
                icon: <Video className="w-7 h-7" />,
                step: "3",
                title: "Pick a voice & go",
                description:
                  "Choose from 36+ natural-sounding voices, hit generate, and your video will be ready in minutes.",
                gradient: "linear-gradient(135deg, #DBEAFE, #C7D2FE)",
                iconBg: "#3B82F6",
                accent: "#BFDBFE",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                viewport={{ once: true }}
                className="relative rounded-3xl p-8 border border-white/60 shadow-sm hover:shadow-md transition-shadow duration-300"
                style={{ background: item.gradient }}
              >
                {/* Step number pill */}
                <div
                  className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: item.iconBg }}
                >
                  Step {item.step}
                </div>

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5 shadow-sm"
                  style={{ background: item.iconBg }}
                >
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#2D2235" }}>
                  {item.title}
                </h3>
                <p className="leading-relaxed" style={{ color: "#6B5E7B" }}>
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-3xl p-14 border border-white/60 shadow-sm"
            style={{ background: "linear-gradient(135deg, #2D2235, #3D2E4A)" }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to make your first video?
            </h2>
            <p className="text-lg mb-8" style={{ color: "#B8A9C9" }}>
              It's completely free to start. No account needed.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="text-white px-10 py-7 text-lg rounded-full border-0 font-bold shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
            >
              Get Started — It's Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t" style={{ borderColor: "#F0E6DC" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <img src="/Logo.svg" alt="Raphio" className="h-8" />
          </div>
          <p className="text-sm" style={{ color: "#9B8FA8" }}>
            Make videos from your ideas, no experience needed.
          </p>
        </div>
      </footer>
    </div>
  );
}
