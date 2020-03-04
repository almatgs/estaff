function OnInit()
{
	if ( AppModuleUsed( 'module_efko' ) )
		lib_efko.ConvertRecruitMetricsSet( this );
}


function OnBeforeSave()
{
	for ( targetStaffCategory in ArraySelectAll( target_staff_categories ) )
	{
		targetStaffCategory.max_term_to_job_offer.unit_id = this.max_term_to_job_offer.unit_id;
		targetStaffCategory.max_term_to_job_offer_acceptance.unit_id = this.max_term_to_job_offer_acceptance.unit_id;
		targetStaffCategory.max_term_to_vacancy_close.unit_id = this.max_term_to_vacancy_close.unit_id;
	}
}


function SyncTargetStaffCategories()
{
	for ( staffCategory in lib_voc.get_sorted_voc( staff_categories ) )
	{
		targetStaffCategory = target_staff_categories.ObtainChildByKey( staffCategory.id );
	}

	for ( targetStaffCategory in ArraySelectAll( target_staff_categories ) )
	{
		if ( targetStaffCategory.staff_category_id.OptForeignElem == undefined )
			targetStaffCategory.Delete();
	}

	target_staff_categories.Sort( 'staff_category_id.ForeignElem.order_index', '+' );
}
