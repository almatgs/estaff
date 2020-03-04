function OnCreate()
{
	lib_base.init_new_card_object( This );

	date = CurDate;
	state_id = 'draft';
	
	person = CurAuthObject;
	if ( person != undefined && person.Name == 'person' )
	{
		this.orig_person_id = person.id;
		this.division_id = person.division_id;
		//this.cur_resp_person_id = person.id;
	}
}


function prev_stage_record()
{
	if ( this.workflow_stage_id.HasValue )
	{
		if ( stage_records.ChildNum < 2 )
			return undefined;

		return stage_records[stage_records.ChildNum - 2];
	}
	else
	{
		if ( stage_records.ChildNum < 1 )
			return undefined;

		return stage_records[stage_records.ChildNum - 1];
	}
}


function comb_state_name()
{
	if ( workflow_stage_id.HasValue )
		return workflow_stage_id.ForeignDispName;

	return state_id.ForeignDispName;
}

