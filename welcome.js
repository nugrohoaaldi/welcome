async function create(req, res, next) {
    try {
        let input = new FormInput.FormBooking();
        const body = req.body;
        Object.keys(input).forEach((key) => {
            if (body.hasOwnProperty(key)) {
                if (body[key]) {
                    input[key] = body[key];
                }
            }
        });
        if (input.initial_fee != 0 && input.downpayment == 0) {
            input.downpayment = input.initial_fee;
        }
        let timeMS = lodash.toString(toMiliSecond(currentDate().timestampNow));
        input.bookingID = `MBK${lodash.trim(timeMS, "0")}` + `${input.customerID}`;
        const { vehicleID, booking_start_date, booking_end_date } = input;
        if (vehicleID) {
            const checkAvailability = await BookingModel.checkAvailableDate(
                vehicleID,
                booking_start_date,
                booking_end_date
            );
            if (checkAvailability.length > 0) {
                return res.status(400).json({
                    message: "Vehicle is not available, please choose another date",
                });
            }
        }
        const currentPayment = {
            bookingID: input.bookingID,
            initial_fee: input.initial_fee,
            otr_price: input.otr_price,
            discount: input.discount,
            refund: input.refund,
            monthly_booking_fee: input.monthly_booking_fee,
            next_payment_due_date: input.next_payment_due_date,
            other_initial_fee: input.other_initial_fee,
            confirm_by: body.confirm_by,
            approved_by: body.approved_by,
            status: "PAID",
        };
        const createBooking = await BookingModel.create(input);
        const paymentSuccess = await PaymentReportModel.create(
            currentPayment,
            input.payment_type
        );
        if (!paymentSuccess) {
            await Booking.deleteOne({ bookingID: input.bookingID });
            res.status(203).json({
                message: "Invalid Data",
            });
        }
        return res.status(201).json({
            message: "Successfully created new booking!",
            data: createBooking,
            request: { type: "POST", url: req.originalUrl },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            data: err,
        }); 
    }
}