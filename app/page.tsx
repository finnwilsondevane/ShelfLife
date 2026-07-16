import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  Clock,
  ShoppingBasket,
  SlidersHorizontal,
  Snowflake,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { poolRange } from "@/lib/filters";
import { DINNER_POOL, LUNCH_POOL, MEALS } from "@/lib/meals";
import { INGREDIENTS } from "@/lib/ingredients";
import { Card } from "@/components/ui";

// Read off the real data at build time, so the page cannot drift from the app
// the way hand-typed marketing numbers always do.
const range = poolRange(MEALS);

const STEPS = [
  {
    day: "Saturday",
    title: "Shop",
    icon: ShoppingBasket,
    body: "One list, in aisle order, priced in CAD. Tick things off as you go — it remembers where you were if you close the tab.",
  },
  {
    day: "Sunday",
    title: "Cook",
    icon: ChefHat,
    body: "Everything at once, grouped by station rather than by recipe — because you have one oven and two burners, and that is what really decides the order.",
  },
  {
    day: "All week",
    title: "Eat",
    icon: Clock,
    body: "Most dinners are a three-minute reheat. Nothing asks more than ten minutes on the day.",
  },
];

export default function Home() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="rise">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta">
          Weekly meal planner
        </p>
        <h1 className="mt-2 font-display text-5xl leading-[1.05] text-ink sm:text-7xl">
          Shelf Life
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          <em className="not-italic text-ink">Cooked Sunday, still good Thursday.</em> A
          meal planner that plans around the thing most planners ignore — how long food
          actually lasts.
        </p>

        <Link
          href="/plan"
          className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-ember"
        >
          Open this week&apos;s plan
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.day} className="rise" style={{ animationDelay: `${i * 60}ms` }}>
            <Card className="h-full px-5 py-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                <s.icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                {s.day}
              </div>
              <h2 className="mt-0.5 font-display text-xl text-ink">{s.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.body}</p>
            </Card>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl text-ink">Why it&apos;s called Shelf Life</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <p className="text-[15px] leading-relaxed text-muted">
            Most planners hand you seven recipes and wish you luck. The problem with
            batch cooking is not choosing the food — it is that salmon cooked on Sunday
            is not salmon by Friday.
          </p>
          <p className="text-[15px] leading-relaxed text-muted">
            So every dish carries how long it actually keeps. Short keepers get the
            early days. Anything you would be eating past its fridge life gets flagged to
            freeze on Sunday, while you are already standing there.
          </p>
        </div>

        <Card className="mt-6 flex items-start gap-3 px-5 py-4">
          <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink">
            <strong>Salmon keeps three days, so it lands on Sunday and Monday.</strong>{" "}
            Butter chicken keeps five and genuinely improves, so it can sit at the far end
            of the week. You are never guessing whether Thursday&apos;s lunch is still
            good.
          </p>
        </Card>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl text-ink">What it works out for you</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: CalendarDays,
              title: "A different week, every week",
              body: "The rotation orders dishes so ingredient-sharing ones sit together, then hands each week a sliding window. Weeks vary; the shop stays narrow.",
            },
            {
              icon: SlidersHorizontal,
              title: "Your targets, not mine",
              body: "Calories, protein floor, carb and fat caps, household size, allergies, diet, and a list of things you simply do not like. Dishes that miss drop out.",
            },
            {
              icon: ShoppingBasket,
              title: "A shopping list that knows packs",
              body: "Shops sell whole bags. It buys whole bags, tells you what is spare, and counts that against next week rather than the bin.",
            },
            {
              icon: Wallet,
              title: "What the week actually costs",
              body: "Per week, per person per day, per dish, in CAD. Prices are estimates you can edit — every number recalculates from them.",
            },
          ].map((f, i) => (
            <div key={f.title} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
              <Card className="h-full px-5 py-5">
                <div className="flex items-center gap-2.5">
                  <f.icon className="h-4 w-4 shrink-0 text-terracotta" aria-hidden />
                  <h3 className="font-display text-lg text-ink">{f.title}</h3>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.body}</p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl text-ink">The honest numbers</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Straight from the data this site is built on, not from a brochure.
        </p>
        <Card className="mt-4 overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {[
              { v: `${LUNCH_POOL.length + DINNER_POOL.length}`, l: "dishes in the pool", s: `${LUNCH_POOL.length} lunches, ${DINNER_POOL.length} dinners` },
              { v: `${INGREDIENTS.length}`, l: "ingredients priced", s: "with macros and allergens" },
              { v: `${range.kcal.min}–${range.kcal.max}`, l: "kcal a dish", s: `so a day lands ${(range.kcal.min * 2).toLocaleString()}–${(range.kcal.max * 2).toLocaleString()}` },
              { v: `${range.protein.min}–${range.protein.max} g`, l: "protein a dish", s: "high protein by design" },
            ].map((s) => (
              <div key={s.l} className="bg-surface px-4 py-4">
                <div className="font-display text-2xl leading-none text-ink">{s.v}</div>
                <div className="mt-1.5 text-[11px] font-semibold text-ink">{s.l}</div>
                <div className="mt-0.5 text-[11px] text-muted">{s.s}</div>
              </div>
            ))}
          </div>
        </Card>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-muted">
          Sunday takes roughly three and a half hours for 28 portions. That is the real
          number, not a flattering one — it is the trade you make for a week of
          ten-minute dinners.
        </p>
      </section>

      <section className="mt-16">
        <Card className="px-6 py-8 text-center">
          <h2 className="font-display text-2xl text-ink">Ready when you are</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
            This week&apos;s plan is already built. Set your targets once and it holds
            them.
          </p>
          <Link
            href="/plan"
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-ember"
          >
            Open the planner
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Card>
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-[11px] leading-relaxed text-muted">
        <p>
          Calories and protein are calculated from raw ingredient weights. Prices are
          mid-range Canadian supermarket estimates. Edit either in{" "}
          <code className="rounded bg-sand px-1 py-0.5">lib/ingredients.ts</code> and
          every week recalculates.
        </p>
      </footer>
    </main>
  );
}
