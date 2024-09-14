"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  PlusCircle,
  DollarSign,
  MapPin,
  Edit,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { create } from "zustand";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Chart } from "react-google-charts";
import OpenAI from "openai";
import tax_information from "../app/tax_information.json";

interface JobOffer {
  id: string;
  company: string;
  location: string;
  base: number;
  bonus: number;
  signOn: number;
  relocation: number;
  OtherExpenses: number;
  equity: {
    type: "RSU" | "Options";
    amount: number;
    vestingPeriod: number;
    vestingSchedule: string;
    marketRate: number;
  };
}

const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o-mini";

const locations = tax_information.cities.map((city) => ({
  city: city.city,
  state: city.state,
  rent: city.avg_rent,
  foodCost: city.avg_food,
  stateTax:
    tax_information.states.find((state) => state.state === city.state)
      ?.supplemental_tax || 0,
  localTax: typeof city.supplemental === "number" ? city.supplemental : 0,
}));

const federalTaxBrackets = tax_information.federal.map((bracket) => ({
  rate: bracket.rate,
  threshold: bracket.income_range,
  base: bracket.base,
}));

interface StoreState {
  comparedOffers: JobOffer[];
  setComparedOffers: (offers: JobOffer[]) => void;
}

const useStore = create((set) => ({
  comparedOffers: [],
  setComparedOffers: (offers: JobOffer[]) => set({ comparedOffers: offers }),
}));

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export function NestQuestComponent() {
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const { comparedOffers, setComparedOffers } = useStore() as StoreState;
  const [isEquityDialogOpen, setIsEquityDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditOffer, setCurrentEditOffer] = useState<JobOffer | null>(
    null
  );
  const [locationComparison, setLocationComparison] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company: "",
    location: "",
    base: "",
    bonus: "",
    signOn: "",
    relocation: "",
    OtherExpenses: "",
    equity: {
      type: "RSU",
      amount: "",
      vestingPeriod: "",
      vestingSchedule: "",
      marketRate: "",
    },
  });

  const handleInputChange = (e: {
    target: { name: string; value: string };
  }) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  const handleEquityChange = (e: {
    target: { name: string; value: string };
  }) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      equity: {
        ...prevData.equity,
        [name]: value,
      },
    }));
  };

  const addJobOffer = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const newOffer: JobOffer = {
      ...formData,
      base: parseInt(formData.base) || 0,
      bonus: parseInt(formData.bonus) || 0,
      signOn: parseInt(formData.signOn) || 0,
      relocation: parseInt(formData.relocation) || 0,
      OtherExpenses: parseInt(formData.OtherExpenses) || 0,
      id: isEditMode ? currentEditOffer!.id : Date.now().toString(),
      equity: {
        ...formData.equity,
        type: formData.equity.type as "RSU" | "Options",
        amount: Number(formData.equity.amount),
        vestingPeriod: Number(formData.equity.vestingPeriod),
        marketRate: Number(formData.equity.marketRate),
      },
    };
    if (isEditMode) {
      setJobOffers(
        jobOffers.map((offer) =>
          offer.id === currentEditOffer!.id ? newOffer : offer
        )
      );
      setIsEditMode(false);
      setCurrentEditOffer(null);
    } else {
      setJobOffers([...jobOffers, newOffer]);
    }
    setFormData({
      company: "",
      location: "",
      base: "",
      bonus: "",
      signOn: "",
      relocation: "",
      OtherExpenses: "",
      equity: {
        type: "RSU",
        amount: "",
        vestingPeriod: "",
        vestingSchedule: "",
        marketRate: "",
      },
    });
  };

  const onEquitySubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setIsEquityDialogOpen(false);
  };

  const calculateTaxes = (salary: number, location: string) => {
    const cityData = tax_information.cities.find(
      (city) => `${city.city}, ${city.state}` === location
    );
    const stateData = tax_information.states.find(
      (state) => state.state === cityData?.state
    );
    if (!cityData || !stateData)
      return { federalTax: 0, stateTax: 0, localTax: 0 };

    // Calculate Federal Tax
    let federalTax = 0;
    for (let i = federalTaxBrackets.length - 1; i >= 0; i--) {
      const { rate, threshold, base } = federalTaxBrackets[i];
      if (salary > threshold) {
        federalTax = (salary - threshold) * rate + base;
        break;
      }
    }

    // Calculate State Tax
    let stateTax = 0;
    if (typeof stateData.income_tax === "number") {
      stateTax = salary * stateData.income_tax;
    } else if (Array.isArray(stateData.tax_brackets)) {
      for (let i = stateData.tax_brackets.length - 1; i >= 0; i--) {
        const { rate, income_range, base } = stateData.tax_brackets[i];
        if (salary > income_range) {
          stateTax = (salary - income_range) * rate + base;
          break;
        }
      }
    }

    // Calculate Local Tax
    let localTax = 0;
    if (typeof cityData.supplemental === "number") {
      localTax = salary * cityData.supplemental;
    } else if (Array.isArray(cityData.tax_brackets)) {
      for (let i = cityData.tax_brackets.length - 1; i >= 0; i--) {
        const { rate, income_range, base } = cityData.tax_brackets[i];
        if (salary > income_range) {
          localTax = (salary - income_range) * rate + base;
          break;
        }
      }
    }

    return { federalTax, stateTax, localTax };
  };

  const calculateEffectiveSalary = (offer: JobOffer) => {
    if (!offer) return 0;
    const totalComp = calculateTotalCompensation(offer);
    const { federalTax, stateTax, localTax } = calculateTaxes(
      totalComp,
      offer.location
    );
    return Math.round(totalComp - federalTax - stateTax - localTax);
  };

  const calculateTotalCompensation = (offer: JobOffer) => {
    if (!offer) return 0;
    const baseComp =
      Number(offer.base) +
      Number(offer.bonus) +
      Number(offer.signOn) / 4 +
      Number(offer.relocation) / 4;
    let equityValue = 0;
    if (
      offer.equity &&
      offer.equity.type === "RSU" &&
      offer.equity.amount &&
      offer.equity.marketRate &&
      offer.equity.vestingPeriod
    ) {
      const yearlyEquity =
        (Number(offer.equity.amount) * Number(offer.equity.marketRate)) /
        Number(offer.equity.vestingPeriod);
      equityValue = yearlyEquity;
    }
    return Math.round(baseComp + equityValue);
  };

  const calculateFIRE = (offer: JobOffer) => {
    const effectiveSalary = calculateEffectiveSalary(offer);
    const locationData = locations.find(
      (loc) => `${loc.city}, ${loc.state}` === offer.location
    );
    const expenses =
      (locationData ? locationData.rent * 12 : 2000 * 12) +
      (locationData ? locationData.foodCost * 12 : 500 * 12) +
      (offer.OtherExpenses || 0);
    const savings = effectiveSalary - expenses;

    const fireNumber = expenses * 25;
    const yearsToFIRE0 = fireNumber / savings;
    const yearsToFIRE425 =
      Math.log((fireNumber / savings) * 0.0425 + 1) / Math.log(1.0425);
    const yearsToFIRE10 =
      Math.log((fireNumber / savings) * 0.1 + 1) / Math.log(1.1);

    return {
      fireNumber: fireNumber,
      yearsToFIRE425: yearsToFIRE425,
      yearsToFIRE10: yearsToFIRE10,
      yearsToFIRE0: yearsToFIRE0,
    };
  };

  const renderPieChart = (offer: JobOffer) => {
    const effectiveSalary = calculateEffectiveSalary(offer);
    const locationData = locations.find(
      (loc) => `${loc.city}, ${loc.state}` === offer.location
    );
    const rent = locationData ? locationData.rent * 12 : 2000 * 12;
    const food = locationData ? locationData.foodCost * 12 : 500 * 12;
    const expenses = offer.OtherExpenses || 0;
    const { federalTax, stateTax, localTax } = calculateTaxes(
      calculateTotalCompensation(offer),
      offer.location
    );
    const savings = Math.max(0, effectiveSalary - rent - food - expenses);
    const data = [
      { name: "Rent", value: rent },
      { name: "Food", value: food },
      { name: "Federal Tax", value: Math.round(federalTax) },
      { name: "State Tax", value: Math.round(stateTax) },
      { name: "Local Tax", value: Math.round(localTax) },
      { name: "Savings", value: savings },
      { name: "Other Expenses", value: expenses },
    ];
    const COLORS = [
      "#0088FE",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#AF19FF",
      "#00FF00",
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderComparisonChart = () => {
    if (comparedOffers.length < 2) return null;

    const [offer1, offer2] = comparedOffers;

    const data = [
      { name: "Base Salary", offer1: offer1.base, offer2: offer2.base },
      {
        name: "Total Compensation",
        offer1: calculateTotalCompensation(offer1),
        offer2: calculateTotalCompensation(offer2),
      },
      {
        name: "Effective Salary",
        offer1: calculateEffectiveSalary(offer1),
        offer2: calculateEffectiveSalary(offer2),
      },
    ];

    if (offer1.bonus > 0 || offer2.bonus > 0) {
      data.push({ name: "Bonus", offer1: offer1.bonus, offer2: offer2.bonus });
    }
    if (offer1.signOn > 0 || offer2.signOn > 0) {
      data.push({
        name: "Sign On",
        offer1: offer1.signOn,
        offer2: offer2.signOn,
      });
    }
    if (offer1.relocation > 0 || offer2.relocation > 0) {
      data.push({
        name: "Relocation",
        offer1: offer1.relocation,
        offer2: offer2.relocation,
      });
    }
    if (
      (offer1.equity && offer1.equity.amount > 0) ||
      (offer2.equity && offer2.equity.amount > 0)
    ) {
      data.push({
        name: "Yearly Equity Value",
        offer1: offer1.equity
          ? (offer1.equity.amount * offer1.equity.marketRate) /
            offer1.equity.vestingPeriod
          : 0,
        offer2: offer2.equity
          ? (offer2.equity.amount * offer2.equity.marketRate) /
            offer2.equity.vestingPeriod
          : 0,
      });
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="offer1" name={offer1.company} fill="#8884d8" />
          <Bar dataKey="offer2" name={offer2.company} fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  const renderFIRETimeline = () => {
    if (comparedOffers.length < 2) return null;

    const [offer1, offer2] = comparedOffers;
    const fire1 = calculateFIRE(offer1);
    const fire2 = calculateFIRE(offer2);

    const currentDate = new Date();
    const endDate = new Date(
      currentDate.getFullYear() +
        Math.max(fire1.yearsToFIRE10, fire2.yearsToFIRE10),
      currentDate.getMonth(),
      currentDate.getDate()
    );

    const data = [
      [
        { type: "string", id: "Scenario" },
        { type: "string", id: "Company" },
        { type: "date", id: "Start" },
        { type: "date", id: "End" },
      ],
      [
        "No Interest",
        offer1.company,
        currentDate,
        new Date(
          currentDate.getTime() + fire1.yearsToFIRE0 * 365 * 24 * 60 * 60 * 1000
        ),
      ],
      [
        "No Interest",
        offer2.company,
        currentDate,
        new Date(
          currentDate.getTime() + fire2.yearsToFIRE0 * 365 * 24 * 60 * 60 * 1000
        ),
      ],
      [
        "4.25% Return",
        offer1.company,
        currentDate,
        new Date(
          currentDate.getTime() +
            fire1.yearsToFIRE425 * 365 * 24 * 60 * 60 * 1000
        ),
      ],
      [
        "4.25% Return",
        offer2.company,
        currentDate,
        new Date(
          currentDate.getTime() +
            fire2.yearsToFIRE425 * 365 * 24 * 60 * 60 * 1000
        ),
      ],
      [
        "10% Return",
        offer1.company,
        currentDate,
        new Date(
          currentDate.getTime() +
            fire1.yearsToFIRE10 * 365 * 24 * 60 * 60 * 1000
        ),
      ],
      [
        "10% Return",
        offer2.company,
        currentDate,
        new Date(
          currentDate.getTime() +
            fire2.yearsToFIRE10 * 365 * 24 * 60 * 60 * 1000
        ),
      ],
    ];

    const options = {
      timeline: {
        groupByRowLabel: true,
        colorByRowLabel: true,
      },
      hAxis: {
        format: "yyyy",
        title: "Years to FIRE",
        minValue: currentDate,
        maxValue: endDate,
      },
      colors: ["red", "yellow", "green"],
      backgroundColor: "black",
      tooltip: {
        textStyle: { color: "black" },
        backgroundColor: "black",
      },
    };

    return (
      <Chart
        chartType="Timeline"
        width="100%"
        height="400px"
        data={data}
        options={options}
      />
    );
  };

  const updateComparedOffer = (index: number, value: string) => {
    const newOffer = jobOffers.find((offer) => offer.company === value);
    if (newOffer) {
      const updatedOffers = [...comparedOffers];
      updatedOffers[index] = newOffer;
      setComparedOffers(updatedOffers);
    }
  };

  const isExpensesExceedIncome = (offer: JobOffer) => {
    const effectiveSalary = calculateEffectiveSalary(offer);
    const locationData = locations.find(
      (loc) => `${loc.city}, ${loc.state}` === offer.location
    );
    const expenses =
      (locationData ? locationData.rent * 12 : 2000 * 12) +
      (locationData ? locationData.foodCost * 12 : 500 * 12);
    return expenses > effectiveSalary;
  };

  const handleEdit = (
    offer:
      | React.SetStateAction<JobOffer | null>
      | React.SetStateAction<{
          company: string;
          location: string;
          base: string;
          bonus: string;
          signOn: string;
          relocation: string;
          OtherExpenses: string;
          equity: {
            type: string;
            amount: string;
            vestingPeriod: string;
            vestingSchedule: string;
            marketRate: string;
          };
        }>
  ) => {
    setIsEditMode(true);
    setCurrentEditOffer(offer as JobOffer);
    setFormData(
      offer as {
        company: string;
        location: string;
        base: string;
        bonus: string;
        signOn: string;
        relocation: string;
        OtherExpenses: string;
        equity: {
          type: string;
          amount: string;
          vestingPeriod: string;
          vestingSchedule: string;
          marketRate: string;
        };
      }
    );
  };

  const handleDelete = (offerId: string) => {
    setJobOffers(jobOffers.filter((offer) => offer.id !== offerId));
    setIsEditMode(false);
    setCurrentEditOffer(null);
    setFormData({
      company: "",
      location: "",
      base: "",
      bonus: "",
      signOn: "",
      relocation: "",
      OtherExpenses: "",
      equity: {
        type: "RSU",
        amount: "",
        vestingPeriod: "",
        vestingSchedule: "",
        marketRate: "",
      },
    });
  };

  const fetchLocationComparison = async () => {
    if (comparedOffers.length !== 2) return;

    const [offer1, offer2] = comparedOffers;
    const fire1 = calculateFIRE(offer1);
    const fire2 = calculateFIRE(offer2);

    const prompt = `
      Compare ${offer1.location} and ${
      offer2.location
    } in terms of culture, cost, lifestyle for post-graduates. List pros and cons for each location.
      
      ${offer1.company} Offer Details:
      - Base Salary: ${formatMoney(offer1.base)}
      - Total Compensation: ${formatMoney(calculateTotalCompensation(offer1))}
      - Effective Salary: ${formatMoney(calculateEffectiveSalary(offer1))}
      - FIRE Number: ${formatMoney(fire1.fireNumber)}
      - Years to FIRE (No Interest): ${fire1.yearsToFIRE0.toFixed(2)}
      - Years to FIRE (4.25% Return): ${fire1.yearsToFIRE425.toFixed(2)}
      - Years to FIRE (10% Return): ${fire1.yearsToFIRE10.toFixed(2)}

      ${offer2.company} Offer Details:
      - Base Salary: ${formatMoney(offer2.base)}
      - Total Compensation: ${formatMoney(calculateTotalCompensation(offer2))}
      - Effective Salary: ${formatMoney(calculateEffectiveSalary(offer2))}
      - FIRE Number: ${formatMoney(fire2.fireNumber)}
      - Years to FIRE (No Interest): ${fire2.yearsToFIRE0.toFixed(2)}
      - Years to FIRE (4.25% Return): ${fire2.yearsToFIRE425.toFixed(2)}
      - Years to FIRE (10% Return): ${fire2.yearsToFIRE10.toFixed(2)}

      Consider these financial details in your comparison and analysis.
    `;

    try {
      const client = new OpenAI({
        baseURL: endpoint,
        apiKey: process.env.GITHUB_TOKEN,
      });

      const response = await client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: modelName
      });

      setLocationComparison(response.choices[0].message.content);
    } catch (error) {
      console.error("Error fetching location comparison:", error);
    }
  };

  useEffect(() => {
    if (comparedOffers.length === 2) {
      fetchLocationComparison();
    }
  }, [comparedOffers]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <SignedIn>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-primary">
            NestQuest: Job Offer Comparison Tool
          </h1>
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        <Tabs defaultValue="add" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="add">Add Offer</TabsTrigger>
            <TabsTrigger value="compare">Compare Offers</TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">
                  {isEditMode ? "Edit Job Offer" : "Add New Job Offer"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addJobOffer} className="space-y-8">
                  <div>
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Company
                    </label>
                    <Input
                      id="company"
                      name="company"
                      placeholder="Enter company name"
                      required
                      value={formData.company}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Location
                    </label>
                    <Select
                      name="location"
                      value={formData.location}
                      onValueChange={(value) =>
                        handleInputChange({
                          target: { name: "location", value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem
                            key={`${location.city}, ${location.state}`}
                            value={`${location.city}, ${location.state}`}
                          >
                            {`${location.city}, ${location.state}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      htmlFor="base"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Base Salary
                    </label>
                    <Input
                      id="base"
                      name="base"
                      type="number"
                      placeholder="Enter base salary"
                      required
                      value={formData.base}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bonus"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Bonus
                    </label>
                    <Input
                      id="bonus"
                      name="bonus"
                      type="number"
                      placeholder="Enter bonus amount"
                      value={formData.bonus}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="signOn"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Sign-on Bonus
                    </label>
                    <Input
                      id="signOn"
                      name="signOn"
                      type="number"
                      placeholder="Enter sign-on bonus"
                      value={formData.signOn}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="relocation"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Relocation Amount
                    </label>
                    <Input
                      id="relocation"
                      name="relocation"
                      type="number"
                      placeholder="Enter relocation amount"
                      value={formData.relocation}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="OtherExpenses"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Other Expenses
                    </label>
                    <Input
                      id="OtherExpenses"
                      name="OtherExpenses"
                      type="number"
                      placeholder="Enter other expenses"
                      value={formData.OtherExpenses}
                      onChange={handleInputChange}
                    />
                  </div>

                  <Dialog
                    open={isEquityDialogOpen}
                    onOpenChange={setIsEquityDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button type="button" className="w-full">
                        {formData.equity.amount
                          ? "Edit Equity Details"
                          : "Add Equity Details"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Equity Details</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={onEquitySubmit} className="space-y-8">
                        <div>
                          <label
                            htmlFor="type"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Equity Type
                          </label>
                          <Select
                            name="type"
                            value={formData.equity.type}
                            onValueChange={(value) =>
                              handleEquityChange({
                                target: { name: "type", value },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select equity type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RSU">RSU</SelectItem>
                              <SelectItem value="Options">Options</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label
                            htmlFor="amount"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Amount
                          </label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            placeholder="Enter equity amount"
                            value={formData.equity.amount}
                            onChange={handleEquityChange}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="vestingPeriod"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Vesting Period (years)
                          </label>
                          <Input
                            id="vestingPeriod"
                            name="vestingPeriod"
                            type="number"
                            placeholder="Enter vesting period"
                            value={formData.equity.vestingPeriod}
                            onChange={handleEquityChange}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="vestingSchedule"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Vesting Schedule
                          </label>
                          <Input
                            id="vestingSchedule"
                            name="vestingSchedule"
                            placeholder="e.g., 25-25-25-25"
                            value={formData.equity.vestingSchedule}
                            onChange={handleEquityChange}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="marketRate"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Market Rate
                          </label>
                          <Input
                            id="marketRate"
                            name="marketRate"
                            type="number"
                            placeholder="Enter market rate"
                            value={formData.equity.marketRate}
                            onChange={handleEquityChange}
                          />
                        </div>
                        <Button type="submit">Save Equity Details</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  {formData.equity.amount && Number(formData.equity.amount) > 0 && (
                    <div className="bg-muted p-4 rounded-md mt-2">
                      <h3 className="text-lg font-semibold text-primary mb-2">
                        Equity Details
                      </h3>
                      <p>Type: {formData.equity.type}</p>
                      <p>Amount: {formData.equity.amount}</p>
                      <p>
                        Vesting Period: {formData.equity.vestingPeriod} years
                      </p>
                      <p>Vesting Schedule: {formData.equity.vestingSchedule}</p>
                      <p>
                        Market Rate:{" "}
                        {formatMoney(parseFloat(formData.equity.marketRate))}
                      </p>
                      <Button
                        onClick={() => setIsEquityDialogOpen(true)}
                        className="mt-2"
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit Equity Details
                      </Button>
                    </div>
                  )}
                  <Button type="submit" className="w-full">
                    {isEditMode ? (
                      <>
                        <Edit className="mr-2 h-4 w-4" /> Update Offer
                      </>
                    ) : (
                      <>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Offer
                      </>
                    )}
                  </Button>
                  {isEditMode && (
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full mt-2"
                      onClick={() => handleDelete(currentEditOffer?.id || "")}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Offer
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {jobOffers.map((offer) => (
                <Card
                  key={offer.id}
                  className={
                    isExpensesExceedIncome(offer) ? "border-red-500" : ""
                  }
                >
                  <CardHeader>
                    <CardTitle className="text-primary">
                      {offer.company}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      <MapPin className="inline mr-2 text-muted-foreground" />
                      {offer.location}
                    </p>
                    <p>
                      <DollarSign className="inline mr-2 text-muted-foreground" />
                      Base Salary: {formatMoney(offer.base)}
                    </p>
                    <p>
                      <DollarSign className="inline mr-2 text-muted-foreground" />
                      Total Compensation:{" "}
                      {formatMoney(calculateTotalCompensation(offer))}
                    </p>
                    <p>
                      <DollarSign className="inline mr-2 text-muted-foreground" />
                      Effective Salary:{" "}
                      {formatMoney(calculateEffectiveSalary(offer))}
                    </p>
                    <div className="flex space-x-2 mt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>View Details</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle className="text-primary">
                              {offer.company} Details
                            </DialogTitle>
                          </DialogHeader>
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p>
                                <MapPin className="inline mr-2 text-muted-foreground" />
                                Location: {offer.location}
                              </p>
                              <p>
                                <DollarSign className="inline mr-2 text-muted-foreground" />
                                Base Salary: {formatMoney(offer.base)}
                              </p>
                              {offer.bonus > 0 && (
                                <p>
                                  <DollarSign className="inline mr-2 text-muted-foreground" />
                                  Bonus: {formatMoney(offer.bonus)}
                                </p>
                              )}
                              {offer.signOn > 0 && (
                                <p>
                                  <DollarSign className="inline mr-2 text-muted-foreground" />
                                  Sign On: {formatMoney(offer.signOn)}
                                </p>
                              )}
                              {offer.relocation > 0 && (
                                <p>
                                  <DollarSign className="inline mr-2 text-muted-foreground" />
                                  Relocation: {formatMoney(offer.relocation)}
                                </p>
                              )}
                              {offer.OtherExpenses > 0 && (
                                <p>
                                  <DollarSign className="inline mr-2 text-muted-foreground" />
                                  Other Expenses:{" "}
                                  {formatMoney(offer.OtherExpenses)}
                                </p>
                              )}
                              {offer.equity && offer.equity.amount > 0 && (
                                <>
                                  <p>
                                    <DollarSign className="inline mr-2 text-muted-foreground" />
                                    Equity Type: {offer.equity.type}
                                  </p>
                                  <p>
                                    <DollarSign className="inline mr-2 text-muted-foreground" />
                                    Equity Amount: {offer.equity.amount}
                                  </p>
                                  <p>
                                    <DollarSign className="inline mr-2 text-muted-foreground" />
                                    Vesting Period: {offer.equity.vestingPeriod}{" "}
                                    years
                                  </p>
                                  <p>
                                    <DollarSign className="inline mr-2 text-muted-foreground" />
                                    Vesting Schedule:{" "}
                                    {offer.equity.vestingSchedule}
                                  </p>
                                  <p>
                                    <DollarSign className="inline mr-2 text-muted-foreground" />
                                    Market Rate:{" "}
                                    {formatMoney(offer.equity.marketRate)}
                                  </p>
                                </>
                              )}
                              <p>
                                <DollarSign className="inline mr-2 text-muted-foreground" />
                                Total Compensation:{" "}
                                {formatMoney(calculateTotalCompensation(offer))}
                              </p>
                              <p>
                                <DollarSign className="inline mr-2 text-muted-foreground" />
                                Effective Salary:{" "}
                                {formatMoney(calculateEffectiveSalary(offer))}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold mt-4 mb-2 text-primary">
                                Budget Breakdown
                              </h3>
                              {renderPieChart(offer)}
                            </div>
                          </div>
                          <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4 text-primary">
                              FIRE Calculations
                            </h3>
                            {(() => {
                              const fireCalc = calculateFIRE(offer);
                              return (
                                <>
                                  <p className="flex items-center">
                                    FIRE Number:{" "}
                                    {formatMoney(fireCalc.fireNumber)}
                                    <Popover>
                                      <PopoverTrigger>
                                        <HelpCircle className="ml-2 h-4 w-4" />
                                      </PopoverTrigger>
                                      <PopoverContent>
                                        The FIRE (Financial Independence, Retire
                                        Early) number is 25 times your annual
                                        expenses. This is based on the 4% rule,
                                        which suggests you can withdraw 4% of
                                        your portfolio annually in retirement.
                                      </PopoverContent>
                                    </Popover>
                                  </p>
                                  <p className="flex items-center">
                                    Years to FIRE (No Interest):{" "}
                                    {fireCalc.yearsToFIRE0.toFixed(2)} years
                                    <Popover>
                                      <PopoverTrigger>
                                        <HelpCircle className="ml-2 h-4 w-4" />
                                      </PopoverTrigger>
                                      <PopoverContent>
                                        This is how long it would take to reach
                                        your FIRE number if you simply saved
                                        your money without any investment
                                        returns.
                                      </PopoverContent>
                                    </Popover>
                                  </p>
                                  <p className="flex items-center">
                                    Years to FIRE (4.25% return):{" "}
                                    {fireCalc.yearsToFIRE425.toFixed(2)} years
                                    <Popover>
                                      <PopoverTrigger>
                                        <HelpCircle className="ml-2 h-4 w-4" />
                                      </PopoverTrigger>
                                      <PopoverContent>
                                        This is how long it would take to reach
                                        your FIRE number if you invested your
                                        savings at a 4.25% annual return, which
                                        is a conservative estimate based on
                                        average treasury bond returns.
                                      </PopoverContent>
                                    </Popover>
                                  </p>
                                  <p className="flex items-center">
                                    Years to FIRE (10% return):{" "}
                                    {fireCalc.yearsToFIRE10.toFixed(2)} years
                                    <Popover>
                                      <PopoverTrigger>
                                        <HelpCircle className="ml-2 h-4 w-4" />
                                      </PopoverTrigger>
                                      <PopoverContent>
                                        This is how long it would take to reach
                                        your FIRE number if you invested your
                                        savings at a 10% annual return, which is
                                        based on the historical average return
                                        of the S&P 500.
                                      </PopoverContent>
                                    </Popover>
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button onClick={() => handleEdit(offer)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compare">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Select onValueChange={(value) => updateComparedOffer(0, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first offer" />
                </SelectTrigger>
                <SelectContent>
                  {jobOffers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.company}>
                      {offer.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => updateComparedOffer(1, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second offer" />
                </SelectTrigger>
                <SelectContent>
                  {jobOffers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.company}>
                      {offer.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {comparedOffers.length === 2 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {comparedOffers.map((offer) => (
                    <Card
                      key={offer.id}
                      className={
                        isExpensesExceedIncome(offer) ? "border-red-500" : ""
                      }
                    >
                      <CardHeader>
                        <CardTitle className="text-primary">
                          {offer.company}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>
                          <MapPin className="inline mr-2 text-muted-foreground" />
                          Location: {offer.location}
                        </p>
                        <p>
                          <DollarSign className="inline mr-2 text-muted-foreground" />
                          Base Salary: {formatMoney(offer.base)}
                        </p>
                        {offer.bonus > 0 && (
                          <p>
                            <DollarSign className="inline mr-2 text-muted-foreground" />
                            Bonus: {formatMoney(offer.bonus)}
                          </p>
                        )}
                        {offer.signOn > 0 && (
                          <p>
                            <DollarSign className="inline mr-2 text-muted-foreground" />
                            Sign On: {formatMoney(offer.signOn)}
                          </p>
                        )}
                        {offer.relocation > 0 && (
                          <p>
                            <DollarSign className="inline mr-2 text-muted-foreground" />
                            Relocation: {formatMoney(offer.relocation)}
                          </p>
                        )}
                        {offer.equity && offer.equity.amount > 0 && (
                          <p>
                            <DollarSign className="inline mr-2 text-muted-foreground" />
                            Yearly Equity Value:{" "}
                            {formatMoney(
                              (offer.equity.amount * offer.equity.marketRate) /
                                offer.equity.vestingPeriod
                            )}
                          </p>
                        )}
                        <p className="font-bold mt-2 text-primary">
                          Total Compensation:{" "}
                          {formatMoney(calculateTotalCompensation(offer))}
                        </p>
                        <p className="font-bold text-primary">
                          Effective Salary:{" "}
                          {formatMoney(calculateEffectiveSalary(offer))}
                        </p>
                        {renderPieChart(offer)}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-primary">
                      Offer Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderComparisonChart()}</CardContent>
                </Card>

                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-primary">
                      FIRE Timeline Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderFIRETimeline()}</CardContent>
                </Card>

                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-primary">
                      Location Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {comparedOffers.map((offer, index) => {
                      const locationData = locations.find(
                        (loc) => `${loc.city}, ${loc.state}` === offer.location
                      );
                      return (
                        <div key={index} className="mb-4">
                          <h3 className="font-semibold text-lg">
                            {offer.location}
                          </h3>
                          <p>
                            <DollarSign className="inline mr-2 text-muted-foreground" />
                            Average Rent:{" "}
                            {formatMoney(locationData ? locationData.rent : 0)}
                          </p>
                          <p>
                            <DollarSign className="inline mr-2 text-muted-foreground" />
                            Average Food Cost:{" "}
                            {formatMoney(
                              locationData ? locationData.foodCost : 0
                            )}
                          </p>
                          <p>
                            <DollarSign className="inline mr-2 text-muted-foreground" />
                            State Tax Rate:{" "}
                            {locationData
                              ? (Number(locationData.stateTax) * 100).toFixed(2)
                              : "N/A"}
                            %
                          </p>
                          <p>
                            <DollarSign className="inline mr-2 text-muted-foreground" />
                            Local Tax Rate:{" "}
                            {locationData
                              ? (Number(locationData.localTax) * 100).toFixed(2)
                              : "N/A"}
                            %
                          </p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-primary">
                      Location Pros and Cons
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {locationComparison ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: locationComparison }}
                      />
                    ) : (
                      <p>Loading location comparison...</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SignedIn>

      <SignedOut>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-primary">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need to be signed in to access this content.</p>
            <SignInButton mode="modal">
              <Button className="mt-4">Sign In</Button>
            </SignInButton>
          </CardContent>
        </Card>
      </SignedOut>
    </div>
  );
}
