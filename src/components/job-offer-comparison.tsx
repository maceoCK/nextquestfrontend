'use client'

import React, { useState } from 'react'
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "~/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { PlusCircle, DollarSign, MapPin, Building, Briefcase, User, Edit } from 'lucide-react'
import { create } from 'zustand'

const locations = [
  "New York, NY", "San Francisco, CA", "Seattle, WA", "Austin, TX", "Chicago, IL",
  "Los Angeles, CA", "Boston, MA", "Washington, D.C.", "Denver, CO", "Atlanta, GA"
]

const useStore = create((set) => ({
  comparedOffers: [],
  setComparedOffers: (offers) => set({ comparedOffers: offers }),
}))

export function JobOfferComparisonComponent() {
  const [jobOffers, setJobOffers] = useState([])
  const { comparedOffers, setComparedOffers } = useStore()
  const [isEquityDialogOpen, setIsEquityDialogOpen] = useState(false)
  const [currentOffer, setCurrentOffer] = useState(null)
  const [equityDetails, setEquityDetails] = useState({
    type: 'RSU',
    amount: '',
    vestingPeriod: '',
    vestingSchedule: '',
    marketRate: ''
  })

  const addJobOffer = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const newOffer = Object.fromEntries(formData)
    newOffer.base = parseInt(newOffer.base) || 0
    newOffer.bonus = parseInt(newOffer.bonus) || 0
    newOffer.signOn = parseInt(newOffer.signOn) || 0
    newOffer.relocation = parseInt(newOffer.relocation) || 0
    newOffer.equity = { ...equityDetails }
    setJobOffers([...jobOffers, newOffer])
    setEquityDetails({
      type: 'RSU',
      amount: '',
      vestingPeriod: '',
      vestingSchedule: '',
      marketRate: ''
    })
    e.target.reset()
  }

  const calculateEffectiveSalary = (offer) => {
    if (!offer) return 0
    const totalComp = offer.base + offer.bonus + offer.signOn + offer.relocation
    return Math.round(totalComp * 0.7) // Assuming 30% tax rate
  }

  const calculateTotalCompensation = (offer) => {
    if (!offer) return 0
    const baseComp = offer.base + offer.bonus + (offer.signOn / 4) + (offer.relocation / 4)
    let equityValue = 0
    if (offer.equity && offer.equity.type === 'RSU') {
      const yearlyEquity = (parseFloat(offer.equity.amount) * parseFloat(offer.equity.marketRate)) / parseFloat(offer.equity.vestingPeriod)
      equityValue = yearlyEquity
    }
    return Math.round(baseComp + equityValue)
  }

  const renderPieChart = (offer) => {
    const effectiveSalary = calculateEffectiveSalary(offer)
    const rent = 2000
    const food = 500
    const remaining = effectiveSalary - rent - food
    const data = [
      { name: 'Rent', value: rent },
      { name: 'Food', value: food },
      { name: 'Remaining', value: remaining > 0 ? remaining : 0 }
    ]
    const COLORS = ['#9333EA', '#4C1D95', '#7C3AED']

    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const renderComparisonChart = () => {
    if (comparedOffers.length < 2) return null

    const [offer1, offer2] = comparedOffers

    const data = [
      { name: 'Base Salary', offer1: offer1.base, offer2: offer2.base },
      { name: 'Total Compensation', offer1: calculateTotalCompensation(offer1), offer2: calculateTotalCompensation(offer2) },
    ]

    if (offer1.bonus > 0 || offer2.bonus > 0) {
      data.push({ name: 'Bonus', offer1: offer1.bonus, offer2: offer2.bonus })
    }
    if (offer1.signOn > 0 || offer2.signOn > 0) {
      data.push({ name: 'Sign On', offer1: offer1.signOn, offer2: offer2.signOn })
    }
    if (offer1.relocation > 0 || offer2.relocation > 0) {
      data.push({ name: 'Relocation', offer1: offer1.relocation, offer2: offer2.relocation })
    }
    if ((offer1.equity && parseFloat(offer1.equity.amount) > 0) || (offer2.equity && parseFloat(offer2.equity.amount) > 0)) {
      data.push({ 
        name: 'Yearly Equity Value', 
        offer1: offer1.equity ? (parseFloat(offer1.equity.amount) * parseFloat(offer1.equity.marketRate)) / parseFloat(offer1.equity.vestingPeriod) : 0,
        offer2: offer2.equity ? (parseFloat(offer2.equity.amount) * parseFloat(offer2.equity.marketRate)) / parseFloat(offer2.equity.vestingPeriod) : 0
      })
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
          <XAxis dataKey="name" stroke="#E5E7EB" />
          <YAxis stroke="#E5E7EB" />
          <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
          <Legend />
          <Bar dataKey="offer1" fill="#9333EA" name={offer1.company} />
          <Bar dataKey="offer2" fill="#7C3AED" name={offer2.company} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const updateComparedOffer = (index, value) => {
    const newOffer = jobOffers.find(offer => offer.company === value)
    if (newOffer) {
      const updatedOffers = [...comparedOffers]
      updatedOffers[index] = newOffer
      setComparedOffers(updatedOffers)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-purple-300">Job Offer Comparison Tool</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Tabs defaultValue="add" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-800">
          <TabsTrigger value="add" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">Add Offer</TabsTrigger>
          <TabsTrigger value="compare" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">Compare Offers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="add">
          <Card className="bg-gray-800 border-purple-500">
            <CardHeader>
              <CardTitle className="text-purple-300">Add New Job Offer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addJobOffer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Building className="text-purple-400" />
                  <Input name="company" placeholder="Company" required className="bg-gray-700 text-white placeholder-gray-400 border-purple-500 focus:border-purple-300" />
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="text-purple-400" />
                  <Select name="location" required>
                    <SelectTrigger className="bg-gray-700 text-white border-purple-500 focus:border-purple-300">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-purple-400" />
                  <Input name="base" type="number" placeholder="Base Salary" required className="bg-gray-700 text-white placeholder-gray-400 border-purple-500 focus:border-purple-300" />
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-purple-400" />
                  <Input name="bonus" type="number" placeholder="Bonus" className="bg-gray-700 text-white placeholder-gray-400 border-purple-500 focus:border-purple-300" />
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-purple-400" />
                  <Input name="signOn" type="number" placeholder="Sign On" className="bg-gray-700 text-white placeholder-gray-400 border-purple-500 focus:border-purple-300" />
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-purple-400" />
                  <Input name="relocation" type="number" placeholder="Relocation" className="bg-gray-700 text-white placeholder-gray-400 border-purple-500 focus:border-purple-300" />
                </div>
                <div className="col-span-2">
                  <Dialog open={isEquityDialogOpen} onOpenChange={setIsEquityDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" className="w-full bg-purple-600 hover:bg-purple-700">
                        {equityDetails.amount ? 'Edit Equity Details' : 'Add Equity Details'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 text-white">
                      <DialogHeader>
                        <DialogTitle>Equity Details</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="equity-type" className="text-right">Type</label>
                          <Select value={equityDetails.type} onValueChange={(value) => setEquityDetails({...equityDetails, type: value})}>
                            <SelectTrigger className="col-span-3 bg-gray-700 text-white border-purple-500 focus:border-purple-300">
                              <SelectValue placeholder="Select equity type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RSU">RSU</SelectItem>
                              <SelectItem value="Options">Options</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="equity-amount" className="text-right">Amount</label>
                          <Input
                            id="equity-amount"
                            type="number"
                            value={equityDetails.amount}
                            onChange={(e) => setEquityDetails({...equityDetails, amount: e.target.value})}
                            className="col-span-3 bg-gray-700 text-white border-purple-500 focus:border-purple-300"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="vesting-period" className="text-right">Vesting Period (years)</label>
                          <Input
                            id="vesting-period"
                            type="number"
                            value={equityDetails.vestingPeriod}
                            onChange={(e) => setEquityDetails({...equityDetails, vestingPeriod: e.target.value})}
                            className="col-span-3 bg-gray-700 text-white border-purple-500 focus:border-purple-300"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="vesting-schedule" className="text-right">Vesting Schedule</label>
                          <Input
                            id="vesting-schedule"
                            value={equityDetails.vestingSchedule}
                            onChange={(e) => setEquityDetails({...equityDetails, vestingSchedule: e.target.value})}
                            className="col-span-3 bg-gray-700 text-white border-purple-500 focus:border-purple-300"
                            placeholder="e.g., 25-25-25-25"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label htmlFor="market-rate" className="text-right">Market Rate</label>
                          <Input
                            id="market-rate"
                            type="number"
                            value={equityDetails.marketRate}
                            onChange={(e) => setEquityDetails({...equityDetails, marketRate: e.target.value})}
                            className="col-span-3 bg-gray-700 text-white border-purple-500 focus:border-purple-300"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={() => setIsEquityDialogOpen(false)} className="bg-purple-600 hover:bg-purple-700">Save changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {equityDetails.amount && (
                  <div className="col-span-2 bg-gray-700 p-4 rounded-md mt-2">
                    <h3 className="text-lg font-semibold text-purple-300 mb-2">Equity Details</h3>
                    <p>Type: {equityDetails.type}</p>
                    <p>Amount: {equityDetails.amount}</p>
                    <p>Vesting Period: {equityDetails.vestingPeriod} years</p>
                    <p>Vesting Schedule: {equityDetails.vestingSchedule}</p>
                    <p>Market Rate: ${equityDetails.marketRate}</p>
                    <Button onClick={() => setIsEquityDialogOpen(true)} className="mt-2 bg-purple-600 hover:bg-purple-700">
                      <Edit className="mr-2 h-4 w-4" /> Edit Equity Details
                    </Button>
                  </div>
                )}
                <Button type="submit" className="col-span-2 bg-purple-600 hover:bg-purple-700">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Offer
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {jobOffers.map((offer, index) => (
              <Card key={index} className="bg-gray-800 border-purple-500">
                <CardHeader>
                  <CardTitle className="text-purple-300">{offer.company}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><MapPin className="inline mr-2 text-purple-400" />{offer.location}</p>
                  <p><DollarSign className="inline mr-2 text-purple-400" />Base Salary: ${offer.base}</p>
                  <p><DollarSign className="inline mr-2 text-purple-400" />Total Compensation: ${calculateTotalCompensation(offer)}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="mt-4 bg-purple-600 hover:bg-purple-700">View Details</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-purple-300">{offer.company} Details</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        <p><MapPin className="inline mr-2 text-purple-400" />Location: {offer.location}</p>
                        <p><DollarSign className="inline mr-2 text-purple-400" />Base Salary: ${offer.base}</p>
                        {offer.bonus > 0 && <p><DollarSign className="inline mr-2 text-purple-400" />Bonus: ${offer.bonus}</p>}
                        {offer.signOn > 0 && <p><DollarSign className="inline mr-2 text-purple-400" />Sign On: ${offer.signOn}</p>}
                        {offer.relocation > 0 && <p><DollarSign className="inline mr-2 text-purple-400" />Relocation: ${offer.relocation}</p>}
                        {offer.equity && offer.equity.amount && (
                          <>
                            <p><DollarSign className="inline mr-2 text-purple-400" />Equity Type: {offer.equity.type}</p>
                            <p><DollarSign className="inline mr-2 text-purple-400" />Equity Amount: {offer.equity.amount}</p>
                            <p><DollarSign className="inline mr-2 text-purple-400" />Vesting Period: {offer.equity.vestingPeriod} years</p>
                            <p><DollarSign className="inline mr-2 text-purple-400" />Vesting Schedule: {offer.equity.vestingSchedule}</p>
                            <p><DollarSign className="inline mr-2 text-purple-400" />Market Rate: ${offer.equity.marketRate}</p>
                          </>
                        )}
                        <p><DollarSign className="inline mr-2 text-purple-400" />Total Compensation: ${calculateTotalCompensation(offer)}</p>
                        <p><DollarSign className="inline mr-2 text-purple-400" />Average Rent: $2000</p>
                        <p><DollarSign className="inline mr-2 text-purple-400" />Average Food Cost: $500</p>
                        <h3 className="text-xl font-bold mt-4 mb-2 text-purple-300">Budget Breakdown</h3>
                        {renderPieChart(offer)}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="compare">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Select onValueChange={(value) => updateComparedOffer(0, value)}>
              <SelectTrigger className="bg-gray-700 text-white border-purple-500 focus:border-purple-300">
                <SelectValue placeholder="Select first offer" />
              </SelectTrigger>
              <SelectContent>
                {jobOffers.map((offer, index) => (
                  <SelectItem key={index} value={offer.company}>{offer.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select onValueChange={(value) => updateComparedOffer(1, value)}>
              <SelectTrigger className="bg-gray-700 text-white border-purple-500 focus:border-purple-300">
                <SelectValue placeholder="Select second offer" />
              </SelectTrigger>
              <SelectContent>
                {jobOffers.map((offer, index) => (
                  <SelectItem key={index} value={offer.company}>{offer.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {comparedOffers.length === 2 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {comparedOffers.map((offer, index) => (
                  <Card key={index} className="bg-gray-800 border-purple-500">
                    <CardHeader>
                      <CardTitle className="text-purple-300">{offer.company}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p><MapPin className="inline mr-2 text-purple-400" />Location: {offer.location}</p>
                      <p><DollarSign className="inline mr-2 text-purple-400" />Base Salary: ${offer.base}</p>
                      {offer.bonus > 0 && <p><DollarSign className="inline mr-2 text-purple-400" />Bonus: ${offer.bonus}</p>}
                      {offer.signOn > 0 && <p><DollarSign className="inline mr-2 text-purple-400" />Sign On: ${offer.signOn}</p>}
                      {offer.relocation > 0 && <p><DollarSign className="inline mr-2 text-purple-400" />Relocation: ${offer.relocation}</p>}
                      {offer.equity && offer.equity.amount && (
                        <p><DollarSign className="inline mr-2 text-purple-400" />Yearly Equity Value: ${(parseFloat(offer.equity.amount) * parseFloat(offer.equity.marketRate)) / parseFloat(offer.equity.vestingPeriod)}</p>
                      )}
                      <p className="font-bold mt-2 text-purple-300">Total Compensation: ${calculateTotalCompensation(offer)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="mt-8 bg-gray-800 border-purple-500">
                <CardHeader>
                  <CardTitle className="text-purple-300">Offer Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderComparisonChart()}
                </CardContent>
              </Card>

              <Card className="mt-8 bg-gray-800 border-purple-500">
                <CardHeader>
                  <CardTitle className="text-purple-300">Location Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><DollarSign className="inline mr-2 text-purple-400" />Average Rent Difference: ${Math.abs(2000 - 2000)}</p>
                  <p><DollarSign className="inline mr-2 text-purple-400" />Average Food Cost Difference: ${Math.abs(500 - 500)}</p>
                  <p className="text-sm text-gray-400 mt-2">Note: Using placeholder values for rent and food costs. In a real app, these would be fetched from a database or API based on the actual locations.</p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}