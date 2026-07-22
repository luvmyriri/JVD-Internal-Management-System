<?php

namespace App\Http\Controllers\Fleet;

use App\Http\Controllers\Controller;
use App\Models\DriverUnavailability;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DriverAvailabilityController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['success'=>true,'data'=>DriverUnavailability::with('driver:id,first_name,last_name,email,phone')
            ->when($request->driver_id,fn($q,$id)=>$q->where('driver_id',$id))
            ->when($request->from,fn($q,$from)=>$q->where('ends_at','>',$from))
            ->when($request->to,fn($q,$to)=>$q->where('starts_at','<',$to))->orderBy('starts_at')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'driver_id'=>'required|integer|exists:users,id','starts_at'=>'required|date','ends_at'=>'required|date|after:starts_at',
            'type'=>['required',Rule::in(['leave','rest','training','medical','suspended'])],'reason'=>'required|string|max:2000',
        ]);
        $driver = \App\Models\User::findOrFail($data['driver_id']);
        if ($driver->role !== 'driver') return response()->json(['success'=>false,'message'=>'Selected user is not a driver.'],422);
        $record = \DB::transaction(fn () => DriverUnavailability::create([...$data,'status'=>'approved','created_by'=>$request->user()->id,'approved_by'=>$request->user()->id,'approved_at'=>now()]));
        return response()->json(['success'=>true,'message'=>'Driver unavailability recorded in the allocation calendar.','data'=>$record->load('driver')],201);
    }

    public function destroy(DriverUnavailability $unavailability)
    {
        $unavailability->update(['status'=>'cancelled']);
        return response()->json(['success'=>true,'message'=>'Driver unavailability cancelled.']);
    }
}
