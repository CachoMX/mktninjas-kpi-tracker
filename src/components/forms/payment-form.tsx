'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Payment, ServiceAgreementStatus, CSMName, PaymentType } from '@/types/database'
import { useTeamMembers, useDealTypes, useCSMs, useCreatePayment, useUpdatePayment, usePayments } from '@/hooks/use-commission-data'
import { CommissionCalculator } from '@/lib/commission-calculator'

const paymentSchema = z.object({
  whop_payment_id: z.string().optional(),
  whop_user_id: z.string().optional(),
  amount: z.string().min(1, 'Amount is required'),
  payment_date: z.date(),
  payment_type: z.enum(['New Deal', 'Rebill']),
  deal_type_id: z.number().min(1, 'Deal type is required'),
  billing_full_name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Valid email is required').min(1, 'Email is required'),
  whop_account_name: z.string().optional(),
  whop_account_username: z.string().optional(),
  setter_assigned: z.string().optional(),
  closer_assigned: z.string().optional(),
  service_agreement_status: z.enum(['pending', 'completed']),
  assigned_csm: z.enum(['Maia', 'Luiza', 'Talita', 'Tamara', 'Carolina', 'N/A']),
  parent_payment_id: z.number().optional().nullable()
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface PaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: Payment
  onSuccess?: () => void
}

export function PaymentForm({ open, onOpenChange, payment, onSuccess }: PaymentFormProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [dealTypeMismatchWarning, setDealTypeMismatchWarning] = useState(false)
  const [acknowledgedMismatch, setAcknowledgedMismatch] = useState(false)

  const { data: teamMembers } = useTeamMembers()
  const { data: dealTypes } = useDealTypes()
  const { data: csms } = useCSMs()
  const { data: allPayments } = usePayments()

  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_type: 'New Deal',
      service_agreement_status: 'pending',
      assigned_csm: 'N/A'
    }
  })

  const watchedDate = watch('payment_date')
  const watchedDealTypeId = watch('deal_type_id')
  const watchedPaymentType = watch('payment_type')
  const watchedEmail = watch('email')
  const watchedParentPaymentId = watch('parent_payment_id')

  // Get selected deal type details
  const selectedDealType = dealTypes?.find(dt => dt.id === watchedDealTypeId)
  const isServiceUpgrade = selectedDealType?.name === 'service_upgrade' ||
                          selectedDealType?.display_name?.toLowerCase().includes('service upgrade')

  // Check if CSM is assigned (not N/A)
  // const hasCSMAssigned = watchedAssignedCSM && watchedAssignedCSM !== 'N/A'

  // Check if Setter or Closer is assigned
  // const hasSetterOrCloserAssigned = (watchedSetterAssigned && watchedSetterAssigned !== 'unassigned') ||
  //                                   (watchedCloserAssigned && watchedCloserAssigned !== 'unassigned')

  // Filter available parent payments for rebills
  const availableParentPayments = allPayments?.filter((p: any) => {
    // Only show "New Deal" payments
    if (p.payment_type !== 'New Deal') return false

    // Filter by same client email if email is entered
    if (watchedEmail && p.email) {
      return p.email.toLowerCase() === watchedEmail.toLowerCase()
    }

    return true
  }) || []

  // Check for deal type mismatch between rebill and parent
  const selectedParentPayment = availableParentPayments.find((p: any) => p.id === watchedParentPaymentId)
  const parentDealTypeId = selectedParentPayment?.deal_type_id
  const hasDealTypeMismatch = watchedPaymentType === 'Rebill' &&
                               watchedParentPaymentId &&
                               parentDealTypeId &&
                               watchedDealTypeId &&
                               parentDealTypeId !== watchedDealTypeId

  // Reset form when dialog opens/closes or when payment changes
  useEffect(() => {
    if (open) {
      if (payment) {
        // Editing existing payment
        reset({
          whop_payment_id: payment.whop_payment_id,
          whop_user_id: payment.whop_user_id,
          amount: payment.amount.toString(),
          payment_date: new Date(payment.payment_date),
          payment_type: payment.payment_type || 'New Deal',
          deal_type_id: payment.deal_type_id,
          billing_full_name: payment.billing_full_name,
          email: payment.email,
          whop_account_name: payment.whop_account_name,
          whop_account_username: payment.whop_account_username,
          setter_assigned: payment.setter_assigned || undefined,
          closer_assigned: payment.closer_assigned || undefined,
          service_agreement_status: payment.service_agreement_status,
          assigned_csm: payment.assigned_csm,
          parent_payment_id: payment.parent_payment_id || undefined
        })
      } else {
        // Creating new payment
        reset({
          payment_type: 'New Deal',
          service_agreement_status: 'pending',
          assigned_csm: 'N/A',
          payment_date: new Date()
        })
      }
      // Reset acknowledgment when dialog opens
      setAcknowledgedMismatch(false)
    }
  }, [open, payment, reset])

  // Auto-clear team assignments when deal type changes
  useEffect(() => {
    if (!watchedDealTypeId || !dealTypes) return

    const currentDealType = dealTypes.find(dt => dt.id === watchedDealTypeId)
    if (!currentDealType) return

    const isCurrentServiceUpgrade = currentDealType.name === 'service_upgrade' ||
                                    currentDealType.display_name?.toLowerCase().includes('service upgrade')

    // If Service Upgrade is selected, clear setter/closer since only CSM is allowed
    if (isCurrentServiceUpgrade) {
      setValue('setter_assigned', undefined)
      setValue('closer_assigned', undefined)
    } else {
      // If NOT Service Upgrade, reset CSM to N/A so user can select Setter/Closer
      setValue('assigned_csm', 'N/A')
    }
  }, [watchedDealTypeId, dealTypes, setValue])

  // Show warning when deal type mismatch is detected
  useEffect(() => {
    if (hasDealTypeMismatch && !acknowledgedMismatch) {
      setDealTypeMismatchWarning(true)
    } else {
      setDealTypeMismatchWarning(false)
    }
  }, [hasDealTypeMismatch, acknowledgedMismatch])

  // Reset acknowledgment when parent or deal type changes
  useEffect(() => {
    setAcknowledgedMismatch(false)
  }, [watchedParentPaymentId, watchedDealTypeId])

  const onSubmit = async (data: PaymentFormData) => {
    try {
      // Clear any previous validation errors
      setValidationError(null)

      // Validation: Only ONE team member can be assigned
      const hasSetterAssignedValue = data.setter_assigned && data.setter_assigned !== 'unassigned'
      const hasCloserAssignedValue = data.closer_assigned && data.closer_assigned !== 'unassigned'
      const hasCSMAssignedValue = data.assigned_csm && data.assigned_csm !== 'N/A'

      const assignedCount = [hasSetterAssignedValue, hasCloserAssignedValue, hasCSMAssignedValue].filter(Boolean).length

      if (assignedCount === 0) {
        setValidationError('Please assign exactly ONE team member (Setter OR Closer OR CSM)')
        return
      }

      if (assignedCount > 1) {
        setValidationError('Please assign only ONE team member per payment. You cannot assign multiple team members (Setter, Closer, or CSM) to the same payment.')
        return
      }

      // Validation: Service Upgrade requires CSM
      if (isServiceUpgrade && !hasCSMAssignedValue) {
        setValidationError('Service Upgrade deals require a CSM assignment')
        return
      }

      // Warning: Service Upgrade with Pending status
      if (isServiceUpgrade && data.service_agreement_status === 'pending') {
        setValidationError('⚠️ Service Upgrade deals with "Pending" status will not generate commission until marked as "Completed"')
        return
      }

      // Validation: Non-Service Upgrade cannot have CSM
      if (!isServiceUpgrade && hasCSMAssignedValue) {
        setValidationError('CSM can only be assigned to Service Upgrade deals')
        return
      }

      // Validation: Rebills must have parent payment ID
      if (data.payment_type === 'Rebill' && !data.parent_payment_id) {
        setValidationError('Rebills must be linked to an original "New Deal" payment. Please select a parent deal.')
        return
      }

      // Validation: New Deals should not have parent payment ID
      if (data.payment_type === 'New Deal' && data.parent_payment_id) {
        setValidationError('New Deals cannot have a parent payment. Only Rebills can be linked to parent deals.')
        return
      }

      // Validation: Deal type mismatch warning must be acknowledged
      if (hasDealTypeMismatch && !acknowledgedMismatch) {
        setValidationError('Please acknowledge the deal type mismatch warning before proceeding.')
        return
      }

      let paymentId: number | undefined

      if (payment?.id) {
        const updateData = {
          amount: parseFloat(data.amount),
          payment_date: format(data.payment_date, 'yyyy-MM-dd'),
          payment_type: data.payment_type,
          deal_type_id: data.deal_type_id,
          setter_assigned: data.setter_assigned || null,
          closer_assigned: data.closer_assigned || null,
          service_agreement_status: data.service_agreement_status,
          assigned_csm: data.assigned_csm,
          parent_payment_id: data.parent_payment_id || null,
          whop_payment_id: payment.whop_payment_id,
          whop_user_id: payment.whop_user_id,
          billing_full_name: payment.billing_full_name,
          email: payment.email,
          whop_account_name: payment.whop_account_name,
          whop_account_username: payment.whop_account_username
        }

        await updatePayment.mutateAsync({
          id: payment.id,
          updates: updateData
        })
        paymentId = payment.id
      } else {
        // Generate unique IDs if not provided
        const timestamp = Date.now()
        const insertData = {
          whop_payment_id: data.whop_payment_id || `AUTO-${timestamp}`,
          whop_user_id: data.whop_user_id || `USER-${timestamp}`,
          amount: parseFloat(data.amount),
          payment_date: format(data.payment_date, 'yyyy-MM-dd'),
          payment_type: data.payment_type,
          deal_type_id: data.deal_type_id,
          billing_full_name: data.billing_full_name || '',
          email: data.email || '',
          whop_account_name: data.whop_account_name || '',
          whop_account_username: data.whop_account_username || '',
          setter_assigned: data.setter_assigned || null,
          closer_assigned: data.closer_assigned || null,
          service_agreement_status: data.service_agreement_status,
          assigned_csm: data.assigned_csm,
          parent_payment_id: data.parent_payment_id || null
        }

        const newPayment = await createPayment.mutateAsync(insertData) as any
        paymentId = newPayment?.id
      }

      // Automatically calculate commission after update
      if (paymentId) {
        try {
          await CommissionCalculator.calculateAndSaveCommission(paymentId)
        } catch (error) {
          console.error('Error calculating commission:', error)
          // Don't fail the whole operation if commission calculation fails
        }
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving payment:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      setValidationError('Failed to save payment. Check console for details.')
    }
  }

  const isLoading = isSubmitting || createPayment.isPending || updatePayment.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {payment ? 'Edit Payment' : 'Add New Payment'}
          </DialogTitle>
          <DialogDescription>
            {payment
              ? 'Update the payment information and commission details.'
              : 'Enter the payment information to track commissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Validation Error Message */}
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{validationError}</p>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                ×
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="billing_full_name">Client Name *</Label>
              <Input
                id="billing_full_name"
                type="text"
                {...register('billing_full_name')}
                placeholder="John Doe"
              />
              {errors.billing_full_name && (
                <p className="text-sm text-red-500">{errors.billing_full_name.message}</p>
              )}
            </div>

            {/* Client Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Client Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="5000.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !watchedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchedDate ? format(watchedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watchedDate}
                    onSelect={(date) => {
                      setValue('payment_date', date as Date)
                      setIsCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.payment_date && (
                <p className="text-sm text-red-500">{errors.payment_date.message}</p>
              )}
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select
                value={watch('payment_type')}
                onValueChange={(value: PaymentType) => setValue('payment_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New Deal">New Deal</SelectItem>
                  <SelectItem value="Rebill">Rebill</SelectItem>
                </SelectContent>
              </Select>
              {errors.payment_type && (
                <p className="text-sm text-red-500">{errors.payment_type.message}</p>
              )}
            </div>

            {/* Parent Payment Dropdown - Only for Rebills */}
            {watchedPaymentType === 'Rebill' && (
              <div className="space-y-2">
                <Label>Link to Original Deal *</Label>
                <Select
                  value={watch('parent_payment_id')?.toString() || ''}
                  onValueChange={(value) => setValue('parent_payment_id', value ? parseInt(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent deal" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParentPayments.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No New Deals found for this client email
                      </div>
                    ) : (
                      availableParentPayments.map((parentPayment: any) => {
                        const parentDealType = dealTypes?.find(dt => dt.id === parentPayment.deal_type_id)
                        const teamMember = parentPayment.closer_assigned || parentPayment.setter_assigned || parentPayment.assigned_csm
                        return (
                          <SelectItem key={parentPayment.id} value={parentPayment.id.toString()}>
                            {format(new Date(parentPayment.payment_date), 'MMM dd, yyyy')} -
                            ${parentPayment.amount} -
                            {parentDealType?.display_name} -
                            {teamMember}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
                {errors.parent_payment_id && (
                  <p className="text-sm text-red-500">{errors.parent_payment_id.message}</p>
                )}
                <p className="text-xs text-cyan-500">
                  ℹ️ Rebills inherit the commission rate from the original deal
                </p>

                {/* Deal Type Mismatch Warning */}
                {dealTypeMismatchWarning && (
                  <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 px-4 py-3 rounded-lg mt-2">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">⚠️</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">Deal Type Mismatch Detected</p>
                        <p className="text-sm mb-3">
                          The rebill&apos;s deal type (<strong>{selectedDealType?.display_name}</strong>)
                          doesn&apos;t match the parent deal&apos;s type (<strong>{dealTypes?.find(dt => dt.id === parentDealTypeId)?.display_name}</strong>).
                          This could cause incorrect commission calculations.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAcknowledgedMismatch(true)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-sm font-medium"
                        >
                          I Understand, Proceed Anyway
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deal Type */}
            <div className="space-y-2">
              <Label>Deal Type</Label>
              <Select
                value={watch('deal_type_id')?.toString()}
                onValueChange={(value) => setValue('deal_type_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deal type" />
                </SelectTrigger>
                <SelectContent>
                  {dealTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id!.toString()}>
                      {type.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.deal_type_id && (
                <p className="text-sm text-red-500">{errors.deal_type_id.message}</p>
              )}
              {isServiceUpgrade && (
                <p className="text-xs text-cyan-500">✓ Service Upgrade selected - CSM assignment required</p>
              )}
            </div>

            {/* Service Agreement Status */}
            <div className="space-y-2">
              <Label>Service Agreement Status</Label>
              <Select
                value={watch('service_agreement_status')}
                onValueChange={(value: ServiceAgreementStatus) => setValue('service_agreement_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {errors.service_agreement_status && (
                <p className="text-sm text-red-500">{errors.service_agreement_status.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Team Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Team Assignment</h3>
              <p className="text-sm text-muted-foreground">
                {isServiceUpgrade
                  ? "Service Upgrade deals require a CSM assignment (Setter/Closer not available)"
                  : "Assign exactly ONE team member per payment (Setter OR Closer, NOT both)"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!isServiceUpgrade && (
                  <>
                    <div className="space-y-2">
                      <Label>Assigned Setter</Label>
                      <Select
                        value={watch('setter_assigned') || 'unassigned'}
                        onValueChange={(value) => {
                          setValue('setter_assigned', value === 'unassigned' ? undefined : value)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select setter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers?.setters.map((setter) => (
                            <SelectItem key={setter.full_name} value={setter.full_name}>
                              {setter.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Assigned Closer</Label>
                      <Select
                        value={watch('closer_assigned') || 'unassigned'}
                        onValueChange={(value) => {
                          setValue('closer_assigned', value === 'unassigned' ? undefined : value)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select closer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers?.closers.map((closer) => (
                            <SelectItem key={closer.full_name} value={closer.full_name}>
                              {closer.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {isServiceUpgrade && (
                  <div className="space-y-2 md:col-span-3">
                    <Label>Assigned CSM</Label>
                    <Select
                      value={watch('assigned_csm')}
                      onValueChange={(value: CSMName) => {
                        setValue('assigned_csm', value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSM" />
                      </SelectTrigger>
                      <SelectContent>
                        {csms?.map((csm) => (
                          <SelectItem key={csm.id} value={csm.name}>
                            {csm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.assigned_csm && (
                      <p className="text-sm text-red-500">{errors.assigned_csm.message}</p>
                    )}
                    <p className="text-xs text-cyan-500">✓ Service Upgrade requires CSM assignment</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payment ? 'Update Payment' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}