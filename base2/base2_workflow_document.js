function OnCreate()
{
	lib_base.init_new_card_object( This );
	date = CurDate;
	orig_person_id = lib_user.active_user_person.id;
}


function OnBeforeSave()
{
	if ( type_id.HasValue )
		data_desc = specific_data.desc;
}



function specific_data()
{
	if ( ! type_id.HasValue )
		return data;

	return data.Child( type_id );
}