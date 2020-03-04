function UpdatePhoneCallRecords()
{
	query = 'for $elem in phone_call_records where $elem/candidate_id = null() return $elem/Fields( "id" )';
	idArray = ArrayExtract( XQuery( query ), 'id.Value' );

	for ( id in idArray )
	{
		phoneCallRecordDoc = DefaultDb.OpenObjectDoc( 'phone_call_record', id );
		phoneCallRecord = phoneCallRecordDoc.TopElem;
		phoneCallRecord.UpdateValues();

		//phoneCallRecord.candidate_id = ( phoneCallRecord.external_person_id.ForeignElem.is_candidate ? phoneCallRecord.external_person_id : null );
		if ( ! phoneCallRecord.candidate_id.HasValue )
			continue;

		phoneCallRecordDoc.WriteDocInfo = false;
		phoneCallRecordDoc.Save();
	}
}

