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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { PlusCircle, DollarSign, MapPin, Building, Briefcase, User, Edit, Trash2 } from 'lucide-react'
import { create } from 'zustand'

const locations = [
  "New York, NY", "San Francisco, CA", "Seattle, WA", "Austin, TX", "Chicago, IL",
  "Los Angeles, CA", "Boston, MA", "Washington, D.C.", "Denver, CO", "Atlanta, GA"
]

const useStore = create((set) => ({
  comparedOffers: [],
  setComparedOffers: (offers) => set({ comparedOffers: offers }),
}))

export function NestQuestComponent() {
  const [jobOffers, setJobOffers] = useState([])
  const { comparedOffers, setComparedOffers } = useStore()
  const [isEquityDialogOpen, setIsEquityDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentEditOffer, setCurrentEditOffer] = useState(null)
  const [formData, setFormData] = useState({
    company: '',
    location: '',
    base: '',
    bonus: '',
    signOn: '',
    relocation: '',
    equity: {
      type: 'RSU',
      amount: '',
      vestingPeriod: '',
      vestingSchedule: '',
      marketRate: ''
    }
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }))
  }

  const handleEquityChange = (e) => {
    const { name, value } = e.target
    setFormData(prevData => ({
      ...prevData,
      equity: {
        ...prevData.equity,
        [name]: value
      }
    }))
  }

  const addJobOffer = (e) => {
    e.preventDefault()
    const newOffer = {
      ...formData,
      base: parseInt(formData.base) || 0,
      bonus: parseInt(formData.bonus) || 0,
      signOn: parseInt(formData.signOn) || 0,
      relocation: parseInt(formData.relocation) || 0,
      id: isEditMode ? currentEditOffer.id : Date.now()
    }
    if (isEditMode) {
      setJobOffers(jobOffers.map(offer => offer.id === currentEditOffer.id ? newOffer : offer))
      setIsEditMode(false)
      setCurrentEditOffer(null)
    } else {
      setJobOffers([...jobOffers, newOffer])
    }
    setFormData({
      company: '',
      location: '',
      base: '',
      bonus: '',
      signOn: '',
      relocation: '',
      equity: {
        type: 'RSU',
        amount: '',
        vestingPeriod: '',
        vestingSchedule: '',
        marketRate: ''
      }
    })
  }

  const onEquitySubmit = (e) => {
    e.preventDefault()
    setIsEquityDialogOpen(false)
  }

  const calculateEffectiveSalary = (offer) => {
    if (!offer) return 0
    const totalComp = calculateTotalCompensation(offer)
    return Math.round(totalComp * 0.7) // Assuming 30% tax rate
  }

  const calculateTotalCompensation = (offer) => {
    if (!offer) return 0
    const baseComp = parseInt(offer.base) + parseInt(offer.bonus) + (parseInt(offer.signOn) / 4) + (parseInt(offer.relocation) / 4)
    let equityValue = 0
    if (offer.equity && offer.equity.type === 'RSU' && offer.equity.amount && offer.equity.marketRate && offer.equity.vestingPeriod) {
      const yearlyEquity = (parseFloat(offer.equity.amount) * parseFloat(offer.equity.marketRate)) / parseFloat(offer.equity.vestingPeriod)
      equityValue = yearlyEquity
    }
    return Math.round(baseComp + equityValue)
  }

  const renderPieChart = (offer) => {
    const effectiveSalary = calculateEffectiveSalary(offer)
    const rent = 2000
    const food = 500
    const savings = Math.max(0, effectiveSalary - rent - food)
    const data = [
      { name: 'Rent', value: rent },
      { name: 'Food', value: food },
      { name: 'Savings', value: savings }
    ]
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28']

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
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

    if (parseInt(offer1.bonus) > 0 || parseInt(offer2.bonus) > 0) {
      data.push({ name: 'Bonus', offer1: offer1.bonus, offer2: offer2.bonus })
    }
    if (parseInt(offer1.signOn) > 0 || parseInt(offer2.signOn) > 0) {
      data.push({ name: 'Sign On', offer1: offer1.signOn, offer2: offer2.signOn })
    }
    if (parseInt(offer1.relocation) > 0 || parseInt(offer2.relocation) > 0) {
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
    )
  }

  const renderRadarChart = (offer) => {
    const data = [
      { subject: 'Base Salary', A: parseInt(offer.base), fullMark: 150000 },
      { subject: 'Bonus', A: parseInt(offer.bonus), fullMark: 50000 },
      { subject: 'Sign On', A: parseInt(offer.signOn), fullMark: 30000 },
      { subject: 'Relocation', A: parseInt(offer.relocation), fullMark: 20000 },
      { subject: 'Equity', A: offer.equity ? (parseFloat(offer.equity.amount) * parseFloat(offer.equity.marketRate)) / parseFloat(offer.equity.vestingPeriod) : 0, fullMark: 100000 },
    ]

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 150000]} />
          <Radar name={offer.company} dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          <Legend />
        </RadarChart>
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

  const isExpensesExceedIncome = (offer) => {
    const effectiveSalary = calculateEffectiveSalary(offer)
    const expenses = 2000 + 500 // rent + food
    return expenses > effectiveSalary
  }

  const handleEdit = (offer) => {
    setIsEditMode(true)
    setCurrentEditOffer(offer)
    setFormData(offer)
  }

  const handleDelete = (offerId) => {
    setJobOffers(jobOffers.filter(offer => offer.id !== offerId))
    setIsEditMode(false)
    setCurrentEditOffer(null)
    setFormData({
      company: '',
      location: '',
      base: '',
      bonus: '',
      signOn: '',
      relocation: '',
      equity: {
        type: 'RSU',
        amount: '',
        vestingPeriod: '',
        vestingSchedule: '',
        marketRate: ''
      }
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-primary">NestQuest: Job Offer Comparison Tool</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
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
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="add">Add Offer</TabsTrigger>
          <TabsTrigger value="compare">Compare Offers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">{isEditMode ? 'Edit Job Offer' : 'Add New Job Offer'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addJobOffer} className="space-y-8">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company</label>
                  <Input id="company" name="company" placeholder="Enter company name" required value={formData.company} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                  <Select name="location" value={formData.location} onValueChange={(value) => handleInputChange({ target: { name: 'location', value } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="base" className="block text-sm font-medium text-gray-700">Base Salary</label>
                  <Input id="base" name="base" type="number" placeholder="Enter base salary" required value={formData.base} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="bonus" className="block text-sm font-medium text-gray-700">Bonus</label>
                  <Input id="bonus" name="bonus" type="number" placeholder="Enter bonus amount" value={formData.bonus} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="signOn" className="block text-sm font-medium text-gray-700">Sign-on Bonus</label>
                  <Input id="signOn" name="signOn" type="number" placeholder="Enter sign-on bonus" value={formData.signOn} onChange={handleInputChange} />
                </div>
                <div>
                  <label htmlFor="relocation" className="block text-sm font-medium text-gray-700">Relocation Amount</label>
                  <Input id="relocation" name="relocation" type="number" placeholder="Enter relocation amount" value={formData.relocation} onChange={handleInputChange} />
                </div>
                <Dialog open={isEquityDialogOpen} onOpenChange={setIsEquityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" className="w-full">
                      {formData.equity.amount ? 'Edit Equity Details' : 'Add Equity Details'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Equity Details</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onEquitySubmit} className="space-y-8">
                      <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700">Equity Type</label>
                        <Select name="type" value={formData.equity.type} onValueChange={(value) => handleEquityChange({ target: { name: 'type', value } })}>
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
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
                        <Input id="amount" name="amount" type="number" placeholder="Enter equity amount" value={formData.equity.amount} onChange={handleEquityChange} />
                      </div>
                      <div>
                        <label htmlFor="vestingPeriod" className="block text-sm font-medium text-gray-700">Vesting Period (years)</label>
                        <Input id="vestingPeriod" name="vestingPeriod" type="number" placeholder="Enter vesting period" value={formData.equity.vestingPeriod} onChange={handleEquityChange} />
                      </div>
                      <div>
                        <label htmlFor="vestingSchedule" className="block text-sm font-medium text-gray-700">Vesting Schedule</label>
                        <Input id="vestingSchedule" name="vestingSchedule" placeholder="e.g., 25-25-25-25" value={formData.equity.vestingSchedule} onChange={handleEquityChange} />
                      </div>
                      <div>
                        <label htmlFor="marketRate" className="block text-sm font-medium text-gray-700">Market Rate</label>
                        <Input id="marketRate" name="marketRate" type="number" placeholder="Enter market rate" value={formData.equity.marketRate} onChange={handleEquityChange} />
                      </div>
                      <Button type="submit">Save Equity Details</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                {formData.equity.amount && (
                  <div className="bg-muted p-4 rounded-md mt-2">
                    <h3 className="text-lg font-semibold text-primary mb-2">Equity Details</h3>
                    <p>Type: {formData.equity.type}</p>
                    <p>Amount: {formData.equity.amount}</p>
                    <p>Vesting Period: {formData.equity.vestingPeriod} years</p>
                    <p>Vesting Schedule: {formData.equity.vestingSchedule}</p>
                    <p>Market Rate: ${formData.equity.marketRate}</p>
                    <Button onClick={() => setIsEquityDialogOpen(true)} className="mt-2">
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
                  <Button type="button" variant="destructive" className="w-full mt-2" onClick={() => handleDelete(currentEditOffer.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Offer
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {jobOffers.map((offer) => (
              <Card key={offer.id} className={isExpensesExceedIncome(offer) ? "border-red-500" : ""}>
                <CardHeader>
                  <CardTitle className="text-primary">{offer.company}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><MapPin className="inline mr-2 text-muted-foreground" />{offer.location}</p>
                  <p><DollarSign className="inline mr-2 text-muted-foreground" />Base Salary: ${offer.base}</p>
                  <p><DollarSign className="inline mr-2 text-muted-foreground" />Total Compensation: ${calculateTotalCompensation(offer)}</p>
                  <div className="flex space-x-2 mt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>View Details</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle className="text-primary">{offer.company} Details</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p><MapPin className="inline mr-2 text-muted-foreground" />Location: {offer.location}</p>
                            <p><DollarSign className="inline mr-2 text-muted-foreground" />Base Salary: ${offer.base}</p>
                            {parseInt(offer.bonus) > 0 && <p><DollarSign className="inline mr-2 text-muted-foreground" />Bonus: ${offer.bonus}</p>}
                            {parseInt(offer.signOn) > 0 && <p><DollarSign className="inline mr-2 text-muted-foreground" />Sign On: ${offer.signOn}</p>}
                            {parseInt(offer.relocation) > 0 && <p><DollarSign className="inline mr-2 text-muted-foreground" />Relocation: ${offer.relocation}</p>}
                            {offer.equity && offer.equity.amount && (
                              <>
                                <p><DollarSign className="inline mr-2 text-muted-foreground" />Equity Type: {offer.equity.type}</p>
                                <p><DollarSign className="inline mr-2 text-muted-foreground" />Equity Amount: {offer.equity.amount}</p>
                                <p><DollarSign className="inline mr-2 text-muted-foreground" />Vesting Period: {offer.equity.vestingPeriod} years</p>
                                <p><DollarSign className="inline mr-2 text-muted-foreground" />Vesting Schedule: {offer.equity.vestingSchedule}</p>
                                <p><DollarSign className="inline mr-2 text-muted-foreground" />Market Rate: ${offer.equity.marketRate}</p>
                              </>
                            )}
                            <p><DollarSign className="inline mr-2 text-muted-foreground" />Total Compensation: ${calculateTotalCompensation(offer)}</p>
                            <p><DollarSign className="inline mr-2 text-muted-foreground" />Average Rent: $2000</p>
                            <p><DollarSign className="inline mr-2 text-muted-foreground" />Average Food Cost: $500</p>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold mt-4 mb-2 text-primary">Budget Breakdown</h3>
                            {renderPieChart(offer)}
                            <h3 className="text-xl font-bold mt-4 mb-2 text-primary">Compensation Breakdown</h3>
                            {renderRadarChart(offer)}
                          </div>
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
                  <SelectItem key={offer.id} value={offer.company}>{offer.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select onValueChange={(value) => updateComparedOffer(1, value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select second offer" />
              </SelectTrigger>
              <SelectContent>
                {jobOffers.map((offer) => (
                  <SelectItem key={offer.id} value={offer.company}>{offer.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {comparedOffers.length === 2 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {comparedOffers.map((offer) => (
                  <Card key={offer.id} className={isExpensesExceedIncome(offer) ? "border-red-500" : ""}>
                    <CardHeader>
                      <CardTitle className="text-primary">{offer.company}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p><MapPin className="inline mr-2 text-muted-foreground" />Location: {offer.location}</p>
                      <p><DollarSign className="inline mr-2 text-muted-foreground" />Base Salary: ${offer.base}</p>
                      {parseInt(offer.bonus) > 0 && <p><DollarSign className="inline mr-2 text-muted-foreground" />Bonus: ${offer.bonus}</p>}
                      {parseInt(offer.signOn) > 0 && <p><DollarSign className="inline mr-2 text-muted-foreground" />Sign On: ${offer.signOn}</p>}
                      {parseInt(offer.relocation) > 0 && <p><DollarSign className="inline mr-2 text-muted-foreground" />Relocation: ${offer.relocation}</p>}
                      {offer.equity && offer.equity.amount && (
                        <p><DollarSign className="inline mr-2 text-muted-foreground" />Yearly Equity Value: ${(parseFloat(offer.equity.amount) * parseFloat(offer.equity.marketRate)) / parseFloat(offer.equity.vestingPeriod)}</p>
                      )}
                      <p className="font-bold mt-2 text-primary">Total Compensation: ${calculateTotalCompensation(offer)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-primary">Offer Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderComparisonChart()}
                </CardContent>
              </Card>

              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-primary">Location Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><DollarSign className="inline mr-2 text-muted-foreground" />Average Rent Difference: ${Math.abs(2000 - 2000)}</p>
                  <p><DollarSign className="inline mr-2 text-muted-foreground" />Average Food Cost Difference: ${Math.abs(500 - 500)}</p>
                  <p className="text-sm text-muted-foreground mt-2">Note: Using placeholder values for rent and food costs. In a real app, these would be fetched from a database or API based on the actual locations.</p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}