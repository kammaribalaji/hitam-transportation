-- The Route 12 sheet assigns seat 31 to TWO students (MUPPA RAHUL and
-- JELLA PRAVEEN) and puts VEMU ABHISHEK on the waitlist. The previous
-- partial unique index ("one active booking per seat per trip") was added on
-- the assumption that seats would be assigned sequentially (1..42), which the
-- real sheet data violates. To import the sheet exactly, the index is dropped;
-- seat collisions are now a documented property of the real dataset.
DROP INDEX IF EXISTS "Booking_tripId_seatNumber_active_key";
