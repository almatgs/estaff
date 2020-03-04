function OnBeforeSave()
{
	this.is_active = ( this.state_id != 'succeeded' && this.state_id != 'failed' && this.state_id != '' );
}


function OnCheckReadAccess()
{
	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	if ( user_id != LdsCurUser.id )
		Cancel();
}


function image_url()
{
	relativeDirection = lib_telephony.GetPhoneCallRecordRelativeDirection( this );
	if ( relativeDirection == 1 )
		return ( this.state_id == 'failed' ? '//base_pict/phone_call_incoming_missed.ico' : '//base_pict/phone_call_incoming.ico' );
	else
		return ( this.state_id == 'failed' ? '//base_pict/phone_call_outgoing_failed.ico' : '//base_pict/phone_call_outgoing.ico' );
}


function is_finished()
{
	return ( this.state_id == 'succeeded' || this.state_id == 'failed' );
}


function src_phone_desc()
{
	if ( this.src_phone_extension.HasValue )
		return this.src_phone_extension;
	else
		return lib_phone_details.FormatPhone( this.src_phone_number );
}


function dest_phone_desc()
{
	if ( this.dest_phone_extension.HasValue )
		return this.dest_phone_extension;
	else
		return lib_phone_details.FormatPhone( this.dest_phone_number );
}


function cur_wait_seconds()
{
	if ( this.date.HasValue && this.date < CurDate && ( this.state_id == 'appeared' || this.state_id == 'queue' || this.state_id == 'waiting' ) )
		return DateDiff( CurDate, this.date );

	return this.wait_seconds;
}


function cur_talk_seconds()
{
	if ( this.state_id == 'connected' && this.talk_start_date.HasValue && this.talk_start_date < CurDate )
		return DateDiff( CurDate, this.talk_start_date );

	return this.talk_seconds;
}


function external_person_id()
{
	if ( direction == 1 )
		return src_person_id;
	else if ( direction == 2 )
		return dest_person_id;
	else
		return empty_person_id;
}