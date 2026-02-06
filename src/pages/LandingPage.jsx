import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Upload,
  Video,
  Wand2,
  Mic2,
  Zap,
  Users,
  Briefcase,
  GraduationCap,
  Play,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/create");
  };

  return (
    <div className="min-h-screen bg-background-gradient font-montserrat">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <span className="text-xl font-semibold text-foreground">Merge</span>
          </div>
          <Button
            onClick={handleGetStarted}
            className="bg-secondary hover:bg-secondary/90 text-white px-6"
          >
            Create Video
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-foreground mb-6"
          >
            Create AI Videos in{" "}
            <span className="text-primary">
              Minutes
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            No sign-up required. Just describe your idea, upload images, and let
            AI generate your video with professional narration.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-white px-8 py-6 text-lg rounded-full"
            >
              Create Your Video Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Wand2 className="w-10 h-10" />,
                step: "1",
                title: "Describe Your Idea",
                description:
                  "Chat with AI to craft your story. Describe what you want and get a professional script.",
              },
              {
                icon: <Upload className="w-10 h-10" />,
                step: "2",
                title: "Upload Images",
                description:
                  "Add your images for each scene. Our AI will bring them to life with motion.",
              },
              {
                icon: <Video className="w-10 h-10" />,
                step: "3",
                title: "Get Your Video",
                description:
                  "Choose a voice, generate, and download your professional video in minutes.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-colors shadow-sm"
              >
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  {item.step}
                </div>
                <div className="text-primary mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "AI Script Generation",
                description:
                  "Get professionally written scripts tailored to your content.",
              },
              {
                icon: <Mic2 className="w-6 h-6" />,
                title: "36+ Professional Voices",
                description:
                  "Choose from a variety of natural-sounding AI voices.",
              },
              {
                icon: <Video className="w-6 h-6" />,
                title: "HD Video Output",
                description: "Generate high-quality videos ready for any platform.",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Fast Processing",
                description: "Get your videos in minutes, not hours.",
              },
              {
                icon: <Wand2 className="w-6 h-6" />,
                title: "Image to Video",
                description: "Transform static images into dynamic video clips.",
              },
              {
                icon: <Play className="w-6 h-6" />,
                title: "Free to Use",
                description: "No credit card or sign-up required to get started.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-6 border border-border shadow-sm"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            Who Is This For?
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Whether you're a creator, marketer, or educator, our AI video
            generator helps you produce professional content quickly.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Users className="w-8 h-8" />,
                title: "Content Creators",
                description: "YouTube videos, social media content, vlogs",
              },
              {
                icon: <Briefcase className="w-8 h-8" />,
                title: "Marketers",
                description: "Product demos, ads, promotional content",
              },
              {
                icon: <GraduationCap className="w-8 h-8" />,
                title: "Educators",
                description: "Tutorials, explainer videos, courses",
              },
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Small Businesses",
                description: "Company intros, service showcases",
              },
            ].map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                  {useCase.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {useCase.title}
                </h3>
                <p className="text-muted-foreground text-sm">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-primary/5 rounded-3xl p-12 border border-primary/20"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Create Your First Video?
            </h2>
            <p className="text-muted-foreground mb-8">
              No credit card required. No sign-up needed. Start creating now.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-white px-8 py-6 text-lg rounded-full font-semibold"
            >
              Get Started - It's Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-foreground font-semibold">Merge</span>
          </div>
          <p className="text-muted-foreground text-sm">
            AI-powered video generation platform
          </p>
        </div>
      </footer>
    </div>
  );
}
