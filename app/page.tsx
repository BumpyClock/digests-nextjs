import { Button } from "@/components/ui/button"
import { ArrowRight, Rss, Headphones, Laptop, Smartphone } from "lucide-react"
import Link from "next/link"
import Image from "next/image"


export default function Home() {
  return (
    <div id="home-container" className="flex flex-col min-h-screen ">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Digests: Your Modern RSS Reader
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Subscribe, manage, and read your favorite RSS feeds and podcasts in one beautiful interface.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/app">
                  <Button size="lg" className="gap-1.5">
                    Launch Web App <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#download">
                  <Button size="lg" variant="outline">
                    Download Apps
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative aspect-video overflow-hidden rounded-xl border bg-background">
                <Image
                  src="/placeholder.svg?height=720&width=1280"
                  width={1280}
                  height={720}
                  alt="App screenshot"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Everything you need in an RSS reader
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Digests combines the best features of modern content consumption with the timeless utility of RSS.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6">
              <div className="rounded-full border p-2">
                <Rss className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">RSS Feeds</h3>
              <p className="text-center text-muted-foreground">
                Subscribe to your favorite websites and blogs with a simple URL.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6">
              <div className="rounded-full border p-2">
                <Headphones className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Podcast Support</h3>
              <p className="text-center text-muted-foreground">
                Listen to podcasts with our built-in player that follows you as you browse.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6">
              <div className="rounded-full border p-2">
                <Laptop className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Reader View</h3>
              <p className="text-center text-muted-foreground">
                Enjoy distraction-free reading with our clean reader view for articles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Available on all your devices</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Download Digests for your preferred platform and stay in sync across all your devices.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="#mac">
                <Button variant="outline" size="lg" className="gap-1.5">
                  <Laptop className="h-5 w-5" />
                  macOS
                </Button>
              </Link>
              <Link href="#windows">
                <Button variant="outline" size="lg" className="gap-1.5">
                  <Laptop className="h-5 w-5" />
                  Windows
                </Button>
              </Link>
              <Link href="#ios">
                <Button variant="outline" size="lg" className="gap-1.5">
                  <Smartphone className="h-5 w-5" />
                  iOS
                </Button>
              </Link>
              <Link href="#android">
                <Button variant="outline" size="lg" className="gap-1.5">
                  <Smartphone className="h-5 w-5" />
                  Android
                </Button>
              </Link>
              <Link href="#linux">
                <Button variant="outline" size="lg" className="gap-1.5">
                  <Laptop className="h-5 w-5" />
                  Linux
                </Button>
              </Link>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-center space-y-2">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  width={600}
                  height={400}
                  alt="Desktop app screenshot"
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-bold">Desktop</h3>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="relative aspect-[9/16] w-[225px] overflow-hidden rounded-lg border">
                <Image
                  src="/placeholder.svg?height=400&width=225"
                  width={225}
                  height={400}
                  alt="Mobile app screenshot"
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-bold">Mobile</h3>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="relative aspect-[4/3] w-[300px] overflow-hidden rounded-lg border">
                <Image
                  src="/placeholder.svg?height=225&width=300"
                  width={300}
                  height={225}
                  alt="Tablet app screenshot"
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-bold">Tablet</h3>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

